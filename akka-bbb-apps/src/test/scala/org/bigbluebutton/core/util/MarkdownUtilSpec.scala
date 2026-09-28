package org.bigbluebutton.core.util

import org.scalatest.flatspec.AnyFlatSpec

class MarkdownUtilSpec extends AnyFlatSpec {

  it should "render a standalone plus sign as literal chat text" in {
    val html = MarkdownUtil.markdownToSafeHtml("+")

    assert(html == "<p>+</p>\n")
  }

  it should "render a standalone plus sign literally inside a multiline message" in {
    val html = MarkdownUtil.markdownToSafeHtml("before\n\n+\n\nafter")

    assert(html.contains("<p>+</p>"))
    assert(!html.contains("<ul>"))
  }

  it should "preserve real plus-prefixed Markdown lists" in {
    val html = MarkdownUtil.markdownToSafeHtml("+ first\n+ second")

    assert(html.contains("<ul>"))
    assert(html.contains("<li>first</li>"))
    assert(html.contains("<li>second</li>"))
  }

  it should "leave plus signs in ordinary text unchanged" in {
    val html = MarkdownUtil.markdownToSafeHtml("1 + 1")

    assert(html == "<p>1 + 1</p>\n")
  }

  it should "preserve an explicitly escaped plus sign" in {
    val html = MarkdownUtil.markdownToSafeHtml("\\+")

    assert(html == "<p>+</p>\n")
  }
}
