import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { defineMessages, injectIntl } from 'react-intl';
import { notify } from '/imports/ui/services/notification';
import Styled from './styles';

const intlMessages = defineMessages({
  wakeLockAcquireFailed: {
    id: 'app.toast.wakeLock.acquireFailed',
  },
  wakeLockNotSupported: {
    id: 'app.toast.wakeLock.notSupported',
  },
  wakeLockDisclaimer: {
    id: 'app.toast.wakeLock.disclaimer',
  },
});

const propTypes = {
  intl: PropTypes.objectOf(Object).isRequired,
  request: PropTypes.func.isRequired,
  release: PropTypes.func.isRequired,
  wakeLockSettings: PropTypes.bool.isRequired,
};

class WakeLock extends Component {
  componentDidMount() {
    this.mounted = true;
    this.requestGeneration = 0;
    const { wakeLockSettings } = this.props;

    if (wakeLockSettings) {
      this.requestWakeLock();
    }
  }

  componentDidUpdate(prevProps) {
    const { wakeLockSettings, release } = this.props;
    if (wakeLockSettings !== prevProps.wakeLockSettings) {
      this.requestGeneration += 1;
      if (wakeLockSettings) {
        this.requestWakeLock();
      } else {
        release();
      }
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    const { release } = this.props;
    release();
  }

  getToast(id, message) {
    return (
      <div id={id}>
        <Styled.Title>
          { message }
        </Styled.Title>
      </div>
    );
  }

  feedbackToast(result) {
    const { intl } = this.props;

    const feedbackToastProps = {
      closeOnClick: true,
      autoClose: true,
      closeButton: false,
    };

    const message = intl.formatMessage(intlMessages.wakeLockDisclaimer, {
      error: intl.formatMessage(intlMessages[result.locale]),
    });
    const feedbackToast = this.getToast('wakeLockToast', message);
    notify(feedbackToast, 'warning', 'lock', feedbackToastProps, null, true);
  }

  requestWakeLock() {
    const { request } = this.props;
    const generation = this.requestGeneration;
    request().then((result) => {
      const { wakeLockSettings } = this.props;
      // A browser refusal must not permanently disable the user's preference.
      if (this.mounted && wakeLockSettings && generation === this.requestGeneration
        && result && result.error) {
        this.feedbackToast(result);
      }
    });
  }

  render() {
    return null;
  }
}

WakeLock.propTypes = propTypes;

export default injectIntl(WakeLock);
