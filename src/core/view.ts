import { Renderer } from "./renderer"
import { Snapshot } from "./snapshot"
import { Position } from "./types"

export interface ViewDelegate<S extends Snapshot> {
  viewWillRenderSnapshot(snapshot: S, isPreview: boolean): void
  viewRenderedSnapshot(snapshot: S, isPreview: boolean): void
  viewInvalidated(): void
}

export abstract class View<E extends Element, S extends Snapshot<E> = Snapshot<E>, R extends Renderer<E, S> = Renderer<E, S>, D extends ViewDelegate<S> = ViewDelegate<S>> {
  readonly delegate: D
  readonly element: E
  renderer?: R
  abstract readonly snapshot: S

  constructor(delegate: D, element: E) {
    this.delegate = delegate
    this.element = element
  }

  // Scrolling

  scrollToAnchor(anchor: string) {
    const element = this.snapshot.getElementForAnchor(anchor)
    if (element) {
      this.scrollToElement(element)
      this.focusElement(element)
    } else {
      this.scrollToPosition({ x: 0, y: 0 })
    }
  }

  scrollToElement(element: Element) {
    element.scrollIntoView()
  }

  focusElement(element: Element) {
    if (element instanceof HTMLElement) {
      if (element.hasAttribute("tabindex")) {
        element.focus()
      } else {
        element.setAttribute("tabindex", "-1")
        element.focus()
        element.removeAttribute("tabindex")
      }
    }
  }

  scrollToPosition({ x, y }: Position) {
    this.scrollRoot.scrollTo(x, y)
  }

  get scrollRoot(): { scrollTo(x: number, y: number): void } {
    return window
  }

  // Rendering

  async render(renderer: R) {
    if (this.renderer) {
      throw new Error("rendering is already in progress")
    }

    const { isPreview, shouldRender, newSnapshot: snapshot } = renderer
    if (shouldRender) {
      try {
        this.renderer = renderer
        this.prepareToRenderSnapshot(renderer)
        this.delegate.viewWillRenderSnapshot(snapshot, isPreview)
        await this.renderSnapshot(renderer)
        this.delegate.viewRenderedSnapshot(snapshot, isPreview)
        this.finishRenderingSnapshot(renderer)
      } finally {
        delete this.renderer
      }
    } else {
      this.invalidate()
    }
  }

  invalidate() {
    this.delegate.viewInvalidated()
  }

  prepareToRenderSnapshot(renderer: R) {
    this.markAsPreview(renderer.isPreview)
    renderer.prepareToRender()
  }

  markAsPreview(isPreview: boolean) {
    if (isPreview) {
      this.element.setAttribute("data-turbo-preview", "")
    } else {
      this.element.removeAttribute("data-turbo-preview")
    }
  }

  async renderSnapshot(renderer: R) {
    await renderer.render()
  }

  finishRenderingSnapshot(renderer: R) {
    renderer.finishRendering()
  }
}
