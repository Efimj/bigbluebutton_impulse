import React from 'react';
import { injectIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { debounce } from '/imports/utils/debounce';
import { throttle } from '/imports/utils/throttle';
import FullscreenButtonContainer from '/imports/ui/components/common/fullscreen-button/container';
import SwitchButtonContainer from './switch-button/container';
import Styled from './styles';
import * as PluginSdk from 'bigbluebutton-html-plugin-sdk';
import VolumeSlider from '../external-video-player/volume-slider/component';
import PluginButtonContainer from '../plugins/plugin-button/container';
import AutoplayOverlay from '../media/autoplay-overlay/component';
import logger from '/imports/startup/client/logger';
import playAndRetry from '/imports/utils/mediaElementPlayRetry';
import { notify } from '/imports/ui/services/notification';
import {
  SCREENSHARE_MEDIA_ELEMENT_NAME,
  screenshareHasEnded,
  screenshareHasStarted,
  setOutputDeviceId,
  getMediaElement,
  getMediaElementDimensions,
  attachLocalPreviewStream,
  setVolume,
  getVolume,
  setStreamEnabled,
} from '/imports/ui/components/screenshare/service';
import { ACTIONS, PRESENTATION_AREA } from '/imports/ui/components/layout/enums';
import { getSettingsSingletonInstance } from '/imports/ui/services/settings';
import deviceInfo from '/imports/utils/deviceInfo';
import { uniqueId } from '/imports/utils/string-utils';
import Session from '/imports/ui/services/storage/in-memory';
import { colorBackground } from '/imports/ui/stylesheets/styled-components/palette';

const MOBILE_HOVER_TIMEOUT = 5000;
const MOBILE_HOVER_INTERVAL = 2000;
const SCREEN_SIZE_DISPATCH_INTERVAL = 500;
const MIN_SCREENSHARE_ZOOM = 1;
const MAX_SCREENSHARE_ZOOM = 4;
const WHEEL_ZOOM_SENSITIVITY = 0.002;

const getScreensharePoint = (container, clientX, clientY) => {
  const rect = container.getBoundingClientRect();

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
    width: rect.width,
    height: rect.height,
  };
};

const isScreenshareZoomEnabled = (isPresenter, switched) => !isPresenter || switched;

const constrainScreenshareOffsets = (zoom, offsetX, offsetY, width, height) => ({
  offsetX: Math.min(0, Math.max(width * (1 - zoom), offsetX)),
  offsetY: Math.min(0, Math.max(height * (1 - zoom), offsetY)),
});

const renderPluginItems = (pluginItems, bottom, right) => {
  if (pluginItems !== undefined) {
    return (
      <>
        {
          pluginItems.map((pluginItem) => {
            const returnComponent = (
              <PluginButtonContainer
                key={`${pluginItem.type}-${pluginItem.id}-${pluginItem.label}`}
                dark
                bottom={bottom}
                right={right}
                icon={pluginItem.icon}
                label={pluginItem.label}
                onClick={pluginItem.onClick}
                dataTest={pluginItem.dataTest}
              />
            );
            return returnComponent;
          })
        }
      </>
    );
  }
  return (<></>);
};

class ScreenshareComponent extends React.Component {
  static renderScreenshareContainerInside(mainText) {
    return (
      <Styled.ScreenshareContainerInside>
        <Styled.MainText>{mainText}</Styled.MainText>
      </Styled.ScreenshareContainerInside>
    );
  }

  constructor(props) {
    super();
    this.state = {
      loaded: false,
      autoplayBlocked: false,
      switched: false,
      // Volume control hover toolbar
      showHoverToolBar: false,
      screenshareRef: null,
      videoTagRef: null,
      screenshareZoom: MIN_SCREENSHARE_ZOOM,
      screenshareOffsetX: 0,
      screenshareOffsetY: 0,
      screensharePanning: false,
    };

    this.onLoadedData = this.onLoadedData.bind(this);
    this.onLoadedMetadata = this.onLoadedMetadata.bind(this);
    this.onVideoResize = this.onVideoResize.bind(this);
    this.handleAllowAutoplay = this.handleAllowAutoplay.bind(this);
    this.handlePlayElementFailed = this.handlePlayElementFailed.bind(this);
    this.failedMediaElements = [];
    this.onSwitched = this.onSwitched.bind(this);
    this.handleOnVolumeChanged = this.handleOnVolumeChanged.bind(this);
    this.dispatchScreenShareSize = this.dispatchScreenShareSize.bind(this);
    this.handleOnMuted = this.handleOnMuted.bind(this);
    this.dispatchScreenShareSize = this.dispatchScreenShareSize.bind(this);
    this.renderScreenshareButtons = this.renderScreenshareButtons.bind(this);
    this.splitPluginItems = this.splitPluginItems.bind(this);
    this.handleScreenshareWheel = this.handleScreenshareWheel.bind(this);
    this.handleScreenshareMouseDown = this.handleScreenshareMouseDown.bind(this);
    this.handleScreenshareMouseMove = this.handleScreenshareMouseMove.bind(this);
    this.handleScreensharePanEnd = this.handleScreensharePanEnd.bind(this);
    this.handleScreenshareTouchStart = this.handleScreenshareTouchStart.bind(this);
    this.handleScreenshareTouchMove = this.handleScreenshareTouchMove.bind(this);
    this.handleScreenshareTouchEnd = this.handleScreenshareTouchEnd.bind(this);
    this.handleMouseMovement = throttle(this.handleMouseMovement.bind(this), MOBILE_HOVER_INTERVAL);
    this.debouncedDispatchScreenShareSize = debounce(
      this.dispatchScreenShareSize,
      SCREEN_SIZE_DISPATCH_INTERVAL,
      { leading: false, trailing: true },
    );

    const { locales, icon } = props;
    this.locales = locales;
    this.icon = icon;

    this.volume = getVolume();
    this.mobileHoverSetTimeout = null;
    this.pinchGesture = null;
    this.panGesture = null;
  }

  componentDidMount() {
    const {
      layoutContextDispatch,
      intl,
      isPresenter,
      startPreviewSizeBig,
      outputDeviceId,
      unpinSharedNotes,
      isSharedNotesPinned,
      hasAudio,
      streamId,
    } = this.props;

    screenshareHasStarted(streamId, hasAudio, isPresenter, { outputDeviceId });
    // Autoplay failure handling
    window.addEventListener('screensharePlayFailed', this.handlePlayElementFailed);
    this.screenshareContainer.addEventListener('wheel', this.handleScreenshareWheel, { passive: false });
    this.screenshareContainer.addEventListener('mousedown', this.handleScreenshareMouseDown);
    this.screenshareContainer.addEventListener('touchstart', this.handleScreenshareTouchStart, { passive: false });
    this.screenshareContainer.addEventListener('touchmove', this.handleScreenshareTouchMove, { passive: false });
    this.screenshareContainer.addEventListener('touchend', this.handleScreenshareTouchEnd);
    this.screenshareContainer.addEventListener('touchcancel', this.handleScreenshareTouchEnd);
    window.addEventListener('mousemove', this.handleScreenshareMouseMove);
    window.addEventListener('mouseup', this.handleScreensharePanEnd);
    // Attaches the local stream if it exists to serve as the local presenter preview
    attachLocalPreviewStream(getMediaElement());

    this.setState({ switched: startPreviewSizeBig });

    notify(intl.formatMessage(this.locales.started), 'info', this.icon);

    layoutContextDispatch({
      type: ACTIONS.SET_PILE_CONTENT_FOR_PRESENTATION_AREA,
      value: {
        content: PRESENTATION_AREA.SCREEN_SHARE,
        open: true,
      },
    });

    Session.setItem('pinnedNotesLastState', isSharedNotesPinned);
    if (isPresenter) {
      unpinSharedNotes();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      isPresenter,
      outputDeviceId,
      shouldShowScreenshare,
      fullscreenContext,
    } = this.props;
    const { videoTagRef } = this.state;
    if (prevProps.isPresenter && !isPresenter) {
      screenshareHasEnded();
    }

    if (prevProps.outputDeviceId !== outputDeviceId && !isPresenter) {
      setOutputDeviceId(outputDeviceId);
    }

    if (isPresenter) setStreamEnabled(shouldShowScreenshare);

    if (prevProps.shouldShowScreenshare && !shouldShowScreenshare) {
      setVolume(0);
    } else if (!prevProps.shouldShowScreenshare && shouldShowScreenshare) {
      this.volume = this.volume || 1;
      // if this.volume is 0, means user didn't change the volume, so we set it to 1
      setVolume(this.volume);
    }

    if ((prevState.videoTagRef !== videoTagRef) && videoTagRef) {
      videoTagRef.addEventListener('mousemove', this.handleMouseMovement);
    }

    if (prevProps.fullscreenContext !== fullscreenContext) {
      this.handleScreenshareZoomReset();
    }
  }

  componentWillUnmount() {
    const {
      intl,
      fullscreenContext,
      layoutContextDispatch,
    } = this.props;
    const {
      videoTagRef,
    } = this.state;
    screenshareHasEnded();
    window.removeEventListener('screensharePlayFailed', this.handlePlayElementFailed);
    if (this.screenshareContainer) {
      this.screenshareContainer.removeEventListener('wheel', this.handleScreenshareWheel);
      this.screenshareContainer.removeEventListener('mousedown', this.handleScreenshareMouseDown);
      this.screenshareContainer.removeEventListener('touchstart', this.handleScreenshareTouchStart);
      this.screenshareContainer.removeEventListener('touchmove', this.handleScreenshareTouchMove);
      this.screenshareContainer.removeEventListener('touchend', this.handleScreenshareTouchEnd);
      this.screenshareContainer.removeEventListener('touchcancel', this.handleScreenshareTouchEnd);
    }
    window.removeEventListener('mousemove', this.handleScreenshareMouseMove);
    window.removeEventListener('mouseup', this.handleScreensharePanEnd);

    const Settings = getSettingsSingletonInstance();
    if (Settings.dataSaving.viewScreenshare) {
      notify(intl.formatMessage(this.locales.ended), 'info', this.icon);
    } else {
      notify(intl.formatMessage(this.locales.endedDueToDataSaving), 'info', this.icon);
    }

    layoutContextDispatch({
      type: ACTIONS.SET_PILE_CONTENT_FOR_PRESENTATION_AREA,
      value: {
        content: PRESENTATION_AREA.SCREEN_SHARE,
        open: false,
      },
    });

    if (fullscreenContext) {
      layoutContextDispatch({
        type: ACTIONS.SET_FULLSCREEN_ELEMENT,
        value: {
          element: '',
          group: '',
        },
      });
    }

    if (videoTagRef) {
      videoTagRef.removeEventListener('mousemove', this.handleMouseMovement);
    }
  }

  handleMouseMovement() {
    clearTimeout(this.mobileHoverSetTimeout);
    this.setState({ showHoverToolBar: true });
    this.mobileHoverSetTimeout = setTimeout(
      () => this.setState({ showHoverToolBar: false }),
      MOBILE_HOVER_TIMEOUT,
    );
  }

  handleScreenshareZoomUpdate(getNextZoom, currentPoint, initialPoint, initialTransform) {
    this.setState((prevState) => {
      const transform = initialTransform || {
        zoom: prevState.screenshareZoom,
        offsetX: prevState.screenshareOffsetX,
        offsetY: prevState.screenshareOffsetY,
      };
      const anchor = initialPoint || currentPoint;
      const nextZoom = Math.min(
        MAX_SCREENSHARE_ZOOM,
        Math.max(MIN_SCREENSHARE_ZOOM, getNextZoom(transform.zoom)),
      );

      if (nextZoom === MIN_SCREENSHARE_ZOOM) {
        return {
          screenshareZoom: MIN_SCREENSHARE_ZOOM,
          screenshareOffsetX: 0,
          screenshareOffsetY: 0,
          screensharePanning: false,
        };
      }

      const contentX = (anchor.x - transform.offsetX) / transform.zoom;
      const contentY = (anchor.y - transform.offsetY) / transform.zoom;
      const offsetX = currentPoint.x - (contentX * nextZoom);
      const offsetY = currentPoint.y - (contentY * nextZoom);
      const constrainedOffsets = constrainScreenshareOffsets(
        nextZoom,
        offsetX,
        offsetY,
        currentPoint.width,
        currentPoint.height,
      );

      return {
        screenshareZoom: nextZoom,
        screenshareOffsetX: constrainedOffsets.offsetX,
        screenshareOffsetY: constrainedOffsets.offsetY,
      };
    });
  }

  handleScreenshareZoomReset() {
    this.pinchGesture = null;
    this.panGesture = null;
    this.setState({
      screenshareZoom: MIN_SCREENSHARE_ZOOM,
      screenshareOffsetX: 0,
      screenshareOffsetY: 0,
      screensharePanning: false,
    });
  }

  handleScreensharePanStart(clientX, clientY) {
    const {
      screenshareZoom,
      screenshareOffsetX,
      screenshareOffsetY,
    } = this.state;

    if (screenshareZoom <= MIN_SCREENSHARE_ZOOM) return;

    this.panGesture = {
      clientX,
      clientY,
      offsetX: screenshareOffsetX,
      offsetY: screenshareOffsetY,
    };
    this.setState({ screensharePanning: true });
  }

  handleScreensharePanMove(clientX, clientY) {
    if (!this.panGesture) return;

    const { screenshareZoom } = this.state;
    if (screenshareZoom <= MIN_SCREENSHARE_ZOOM) {
      this.handleScreensharePanEnd();
      return;
    }

    const rect = this.screenshareContainer.getBoundingClientRect();
    const constrainedOffsets = constrainScreenshareOffsets(
      screenshareZoom,
      this.panGesture.offsetX + clientX - this.panGesture.clientX,
      this.panGesture.offsetY + clientY - this.panGesture.clientY,
      rect.width,
      rect.height,
    );

    this.setState({
      screenshareOffsetX: constrainedOffsets.offsetX,
      screenshareOffsetY: constrainedOffsets.offsetY,
    });
  }

  handleScreensharePanEnd() {
    if (!this.panGesture) return;

    this.panGesture = null;
    this.setState({ screensharePanning: false });
  }

  handleScreenshareMouseDown(event) {
    const { screenshareZoom } = this.state;
    const interactiveTarget = event.target.closest?.(
      'button, input, a, [role="button"], [role="slider"]',
    );

    if (event.button !== 0
      || screenshareZoom <= MIN_SCREENSHARE_ZOOM
      || interactiveTarget) return;

    event.preventDefault();
    event.stopPropagation();
    this.handleScreensharePanStart(event.clientX, event.clientY);
  }

  handleScreenshareMouseMove(event) {
    if (!this.panGesture) return;

    event.preventDefault();
    this.handleScreensharePanMove(event.clientX, event.clientY);
  }

  handleScreenshareWheel(event) {
    const { isPresenter } = this.props;
    const { switched } = this.state;

    if (!event.ctrlKey || !isScreenshareZoomEnabled(isPresenter, switched)) return;

    event.preventDefault();
    const point = getScreensharePoint(
      this.screenshareContainer,
      event.clientX,
      event.clientY,
    );
    let normalizedDelta = event.deltaY;
    if (event.deltaMode === 1) normalizedDelta *= 16;
    if (event.deltaMode === 2) normalizedDelta *= window.innerHeight;
    const zoomFactor = Math.exp(-normalizedDelta * WHEEL_ZOOM_SENSITIVITY);

    this.handleScreenshareZoomUpdate((zoom) => zoom * zoomFactor, point);
  }

  handleScreenshareTouchStart(event) {
    const { isPresenter } = this.props;
    const {
      switched,
      screenshareZoom,
      screenshareOffsetX,
      screenshareOffsetY,
    } = this.state;

    if (!isScreenshareZoomEnabled(isPresenter, switched)) {
      this.pinchGesture = null;
      this.handleScreensharePanEnd();
      return;
    }

    if (event.touches.length === 1 && screenshareZoom > MIN_SCREENSHARE_ZOOM) {
      event.preventDefault();
      event.stopPropagation();
      this.pinchGesture = null;
      const touch = event.touches[0];
      this.handleScreensharePanStart(touch.clientX, touch.clientY);
      return;
    }

    if (event.touches.length !== 2) return;

    event.preventDefault();
    event.stopPropagation();
    this.handleScreensharePanEnd();
    const firstTouch = event.touches[0];
    const secondTouch = event.touches[1];
    const center = getScreensharePoint(
      this.screenshareContainer,
      (firstTouch.clientX + secondTouch.clientX) / 2,
      (firstTouch.clientY + secondTouch.clientY) / 2,
    );

    const distance = Math.hypot(
      secondTouch.clientX - firstTouch.clientX,
      secondTouch.clientY - firstTouch.clientY,
    );
    if (distance === 0) return;

    this.pinchGesture = {
      distance,
      center,
      transform: {
        zoom: screenshareZoom,
        offsetX: screenshareOffsetX,
        offsetY: screenshareOffsetY,
      },
    };
  }

  handleScreenshareTouchMove(event) {
    if (this.panGesture && event.touches.length === 1) {
      event.preventDefault();
      event.stopPropagation();
      const touch = event.touches[0];
      this.handleScreensharePanMove(touch.clientX, touch.clientY);
      return;
    }

    if (!this.pinchGesture || event.touches.length !== 2) return;

    event.preventDefault();
    event.stopPropagation();
    const firstTouch = event.touches[0];
    const secondTouch = event.touches[1];
    const distance = Math.hypot(
      secondTouch.clientX - firstTouch.clientX,
      secondTouch.clientY - firstTouch.clientY,
    );
    const center = getScreensharePoint(
      this.screenshareContainer,
      (firstTouch.clientX + secondTouch.clientX) / 2,
      (firstTouch.clientY + secondTouch.clientY) / 2,
    );
    const zoomRatio = distance / this.pinchGesture.distance;

    this.handleScreenshareZoomUpdate(
      () => this.pinchGesture.transform.zoom * zoomRatio,
      center,
      this.pinchGesture.center,
      this.pinchGesture.transform,
    );
  }

  handleScreenshareTouchEnd(event) {
    this.pinchGesture = null;
    this.handleScreensharePanEnd();

    const { screenshareZoom } = this.state;
    if (event.touches.length === 1 && screenshareZoom > MIN_SCREENSHARE_ZOOM) {
      const touch = event.touches[0];
      this.handleScreensharePanStart(touch.clientX, touch.clientY);
    }
  }

  handleAllowAutoplay() {
    const { autoplayBlocked } = this.state;

    logger.info({
      logCode: 'screenshare_autoplay_allowed',
    }, 'Screenshare media autoplay allowed by the user');

    window.removeEventListener('screensharePlayFailed', this.handlePlayElementFailed);
    while (this.failedMediaElements.length) {
      const mediaElement = this.failedMediaElements.shift();
      if (mediaElement) {
        const played = playAndRetry(mediaElement);
        if (!played) {
          logger.error({
            logCode: 'screenshare_autoplay_handling_failed',
          }, 'Screenshare autoplay handling failed to play media');
        } else {
          logger.info({
            logCode: 'screenshare_viewer_media_play_success',
          }, 'Screenshare viewer media played successfully');
        }
      }
    }
    if (autoplayBlocked) { this.setState({ autoplayBlocked: false }); }
  }

  handlePlayElementFailed(e) {
    const { mediaElement } = e.detail;
    const { autoplayBlocked } = this.state;

    e.stopPropagation();
    this.failedMediaElements.push(mediaElement);
    if (!autoplayBlocked) {
      logger.info({
        logCode: 'screenshare_autoplay_prompt',
      }, 'Prompting user for action to play screenshare media');

      this.setState({ autoplayBlocked: true });
    }
  }

  handleOnVolumeChanged(volume) {
    this.volume = volume;
    setVolume(volume);
  }

  handleOnMuted(muted) {
    if (muted) {
      setVolume(0);
    } else {
      setVolume(this.volume);
    }
  }

  onLoadedMetadata() {
    const element = getMediaElement();

    // Track HTMLVideo's resize event to propagate stream size changes to the
    // layout engine. See this.onVideoResize;
    if (element && typeof element.onresize !== 'function') {
      element.onresize = this.onVideoResize;
    }

    // Dispatch the initial stream size to the layout engine
    this.dispatchScreenShareSize();
  }

  onLoadedData() {
    this.setState({ loaded: true });
  }

  onSwitched() {
    this.pinchGesture = null;
    this.panGesture = null;
    this.setState((prevState) => {
      const switched = !prevState.switched;

      return switched ? { switched } : {
        switched,
        screenshareZoom: MIN_SCREENSHARE_ZOOM,
        screenshareOffsetX: 0,
        screenshareOffsetY: 0,
        screensharePanning: false,
      };
    });
  }

  onVideoResize() {
    // Debounced version of the dispatcher to pace things out - we don't want
    // to hog the CPU just for resize recalculations...
    this.debouncedDispatchScreenShareSize();
  }

  dispatchScreenShareSize() {
    const {
      layoutContextDispatch,
    } = this.props;

    const { width, height } = getMediaElementDimensions();
    const value = {
      width,
      height,
      browserWidth: window.innerWidth,
      browserHeight: window.innerHeight,
    };

    layoutContextDispatch({
      type: ACTIONS.SET_SCREEN_SHARE_SIZE,
      value,
    });
  }

  splitPluginItems() {
    const { pluginScreenshareHelperItems } = this.props;

    return pluginScreenshareHelperItems.reduce((result, item) => {
      switch (item.position) {
        case PluginSdk.ScreenshareHelperItemPosition.TOP_RIGHT:
          result.topRightPluginItems.push(item);
          break;
        case PluginSdk.ScreenshareHelperItemPosition.TOP_LEFT:
          result.topLeftPluginItems.push(item);
          break;
        case PluginSdk.ScreenshareHelperItemPosition.BOTTOM_RIGHT:
          result.bottomRightPluginItems.push(item);
          break;
        case PluginSdk.ScreenshareHelperItemPosition.BOTTOM_LEFT:
          result.bottomLeftPluginItems.push(item);
          break;
        default:
          break;
      }
      return result;
    }, {
      topRightPluginItems: [],
      topLeftPluginItems: [],
      bottomRightPluginItems: [],
      bottomLeftPluginItems: [],
    });
  }

  renderFullscreenButton() {
    const {
      intl,
      fullscreenElementId,
      fullscreenContext,
      isBot,
    } = this.props;

    const ALLOW_FULLSCREEN = window.meetingClientSettings.public.app.allowFullscreen;

    if (!ALLOW_FULLSCREEN || isBot) return null;

    return (
      <Styled.FullscreenButtonWrapperForScreenshare>
        <FullscreenButtonContainer
          key={uniqueId('fullscreenButton-')}
          elementName={intl.formatMessage(this.locales.label)}
          fullscreenRef={this.screenshareContainer}
          elementId={fullscreenElementId}
          isFullscreen={fullscreenContext}
          showOnIphone={deviceInfo.isMobile}
          presentationMenuStyle={deviceInfo.isMobile}
          dark
        />
      </Styled.FullscreenButtonWrapperForScreenshare>
    );
  }

  renderAutoplayOverlay() {
    const { intl } = this.props;

    return (
      <AutoplayOverlay
        key={uniqueId('screenshareAutoplayOverlay')}
        autoplayBlockedDesc={intl.formatMessage(this.locales.autoplayBlockedDesc)}
        autoplayAllowLabel={intl.formatMessage(this.locales.autoplayAllowLabel)}
        handleAllowAutoplay={this.handleAllowAutoplay}
      />
    );
  }

  renderSwitchButton() {
    const { showSwitchPreviewSizeButton } = this.props;
    const { switched } = this.state;

    if (!showSwitchPreviewSizeButton) return null;

    return (
      <SwitchButtonContainer
        handleSwitch={this.onSwitched}
        switched={switched}
        dark
      />
    );
  }

  renderMobileVolumeControlOverlay() {
    return (
      <Styled.MobileControlsOverlay
        key="mobile-overlay-screenshare"
        ref={(ref) => { this.overlay = ref; }}
        onTouchStart={() => {
          clearTimeout(this.mobileHoverSetTimeout);
          this.setState({ showHoverToolBar: true });
        }}
        onTouchEnd={() => {
          this.mobileHoverSetTimeout = setTimeout(
            () => this.setState({ showHoverToolBar: false }),
            MOBILE_HOVER_TIMEOUT,
          );
        }}
      />
    );
  }

  renderVolumeSlider() {
    const { isBot } = this.props;
    const { showHoverToolBar } = this.state;

    if (isBot) return null;

    let toolbarStyle = 'hoverToolbar';

    if (!showHoverToolBar) {
      toolbarStyle = 'dontShowMobileHoverToolbar';
    } else {
      toolbarStyle = 'showMobileHoverToolbar';
    }

    return [(
      <Styled.HoverToolbar
        toolbarStyle={toolbarStyle}
        key="hover-toolbar-screenshare"
      >
        <VolumeSlider
          volume={getVolume()}
          muted={getVolume() === 0}
          onVolumeChanged={this.handleOnVolumeChanged}
          onMuted={this.handleOnMuted}
        />
      </Styled.HoverToolbar>
    ),
    (deviceInfo.isMobile) && this.renderMobileVolumeControlOverlay(),
    ];
  }

  renderVideo(switched) {
    const { isGloballyBroadcasting } = this.props;
    const {
      videoTagRef,
      screenshareZoom,
      screenshareOffsetX,
      screenshareOffsetY,
    } = this.state;
    const sizeStyle = switched
      ? { maxHeight: '100%', width: '100%', height: '100%' }
      : { maxHeight: '25%', width: '25%', height: '25%' };
    const zoomStyle = switched ? {
      transform: `translate3d(${screenshareOffsetX}px, ${screenshareOffsetY}px, 0) scale(${screenshareZoom})`,
      transformOrigin: '0 0',
      willChange: screenshareZoom > MIN_SCREENSHARE_ZOOM ? 'transform' : 'auto',
    } : {};

    return (
      <Styled.ScreenshareVideo
        id={SCREENSHARE_MEDIA_ELEMENT_NAME}
        key={SCREENSHARE_MEDIA_ELEMENT_NAME}
        unhealthyStream={!isGloballyBroadcasting}
        style={{ ...sizeStyle, ...zoomStyle }}
        playsInline
        onLoadedData={this.onLoadedData}
        onLoadedMetadata={this.onLoadedMetadata}
        ref={(ref) => {
          this.videoTag = ref;
          if (!videoTagRef && ref) {
            this.setState({
              videoTagRef: ref,
            });
          }
        }}
        muted
      />
    );
  }

  renderScreensharePresenter() {
    const { switched } = this.state;
    const { isGloballyBroadcasting, intl } = this.props;

    return (
      <>
        {this.renderVideo(switched)}

        {
          isGloballyBroadcasting
            ? (
              <div data-test="isSharingScreen">
                {!switched
                  && ScreenshareComponent.renderScreenshareContainerInside(
                    intl.formatMessage(this.locales.presenterSharingLabel),
                  )}
              </div>
            )
            : ScreenshareComponent.renderScreenshareContainerInside(
              intl.formatMessage(this.locales.presenterLoadingLabel),
            )
        }
      </>
    );
  }

  renderScreenshareDefault() {
    const { intl, enableVolumeControl } = this.props;
    const { loaded } = this.state;

    return (
      <>
        {this.renderVideo(true)}
        {loaded && enableVolumeControl && this.renderVolumeSlider() }

        <Styled.ScreenshareContainerDefault>
          {
            !loaded
              ? ScreenshareComponent.renderScreenshareContainerInside(
                intl.formatMessage(this.locales.viewerLoadingLabel),
              )
              : null
          }
        </Styled.ScreenshareContainerDefault>
      </>
    );
  }

  renderScreenshareButtons() {
    const { isPresenter, isGloballyBroadcasting } = this.props;
    const { loaded } = this.state;
    const {
      topRightPluginItems,
      topLeftPluginItems,
      bottomRightPluginItems,
      bottomLeftPluginItems,
    } = this.splitPluginItems();
    return (
      <>
        <Styled.ScreenshareButtonsContainterWrapper
          positionYAxis="top"
          positionXAxis="left"
        >
          {renderPluginItems(topLeftPluginItems, false, false)}
        </Styled.ScreenshareButtonsContainterWrapper>
        <Styled.ScreenshareButtonsContainterWrapper
          positionYAxis="top"
          positionXAxis="right"
        >
          {deviceInfo.isMobile && this.renderFullscreenButton()}
          {isPresenter
            // Presenter button:
            ? isGloballyBroadcasting && this.renderSwitchButton()
            // Non-presenter button (mobile renders it above even while loading):
            : !deviceInfo.isMobile && loaded && this.renderFullscreenButton()}
          {renderPluginItems(topRightPluginItems, false, true)}
        </Styled.ScreenshareButtonsContainterWrapper>
        <Styled.ScreenshareButtonsContainterWrapper
          positionYAxis="bottom"
          positionXAxis="left"
        >
          {renderPluginItems(bottomLeftPluginItems, true, false)}
        </Styled.ScreenshareButtonsContainterWrapper>
        <Styled.ScreenshareButtonsContainterWrapper
          positionYAxis="bottom"
          positionXAxis="right"
        >
          {renderPluginItems(bottomRightPluginItems, true, true)}
        </Styled.ScreenshareButtonsContainterWrapper>
      </>
    );
  }

  render() {
    const {
      loaded,
      autoplayBlocked,
      switched,
      screenshareRef,
      screenshareZoom,
      screensharePanning,
    } = this.state;
    const {
      isPresenter,
      isGloballyBroadcasting,
      top,
      left,
      right,
      width,
      height,
      zIndex,
      fullscreenContext,
      shouldShowScreenshare,
    } = this.props;

    // Conditions to render the connecting animation
    // 1 - The local media tag has not received any stream data yet
    // 2 - The user is a presenter and the stream wasn't globally broadcasted yet
    const shouldRenderConnectingState = !loaded
      || (isPresenter && !isGloballyBroadcasting);

    const display = (width > 0 && height > 0) && shouldShowScreenshare ? 'inherit' : 'none';
    const Settings = getSettingsSingletonInstance();
    const { animations } = Settings.application;
    let screenshareCursor = 'default';
    if (screenshareZoom > MIN_SCREENSHARE_ZOOM) {
      screenshareCursor = screensharePanning ? 'grabbing' : 'grab';
    }

    return (
      <div
        style={
          {
            position: 'absolute',
            display,
            top,
            left,
            right,
            height,
            width,
            zIndex: fullscreenContext ? zIndex : undefined,
            backgroundColor: colorBackground,
          }
        }
      >
        {(shouldRenderConnectingState)
          && (
            <Styled.SpinnerWrapper
              key={uniqueId('screenshareArea-')}
              data-test="screenshareConnecting"
            >
              <Styled.Spinner animations={animations}>
                <Styled.Bounce1 animations={animations} />
                <Styled.Bounce2 animations={animations} />
                <div />
              </Styled.Spinner>
            </Styled.SpinnerWrapper>
          )}
        {autoplayBlocked ? this.renderAutoplayOverlay() : null}
        <Styled.ScreenshareContainer
          switched={isPresenter ? switched : true}
          style={{
            cursor: screenshareCursor,
            touchAction: screenshareZoom > MIN_SCREENSHARE_ZOOM ? 'none' : 'pan-x pan-y',
          }}
          key="screenshareContainer"
          ref={(ref) => {
            this.screenshareContainer = ref;
            if (!screenshareRef && ref) {
              this.setState({
                screenshareRef: ref,
              });
            }
          }}
          id="screenshareContainer"
        >
          {this.renderScreenshareButtons()}
          {isPresenter
            ? this.renderScreensharePresenter()
            : this.renderScreenshareDefault()}
        </Styled.ScreenshareContainer>
      </div>
    );
  }
}

export default injectIntl(ScreenshareComponent);

ScreenshareComponent.propTypes = {
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  pluginScreenshareHelperItems: PropTypes.arrayOf(PropTypes.objectOf({
    position: PropTypes.string,
  })).isRequired,
  isPresenter: PropTypes.bool.isRequired,
  layoutContextDispatch: PropTypes.func.isRequired,
  enableVolumeControl: PropTypes.bool.isRequired,
  outputDeviceId: PropTypes.string,
  streamId: PropTypes.string.isRequired,
  isBot: PropTypes.bool.isRequired,
};
