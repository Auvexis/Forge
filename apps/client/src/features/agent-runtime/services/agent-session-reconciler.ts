import type { AgentSessionSnapshot } from '../types/agent.types'

export interface AgentSessionReconcilerState {
  snapshot: AgentSessionSnapshot | null
  loading: boolean
  error: unknown
}

export class AgentSessionReconciler {
  readonly state: AgentSessionReconcilerState = {
    snapshot: null,
    loading: false,
    error: null,
  }

  private requestSequence = 0
  private appliedSequence = 0
  private inFlight: Promise<AgentSessionSnapshot | null> | null = null
  private refreshQueued = false

  constructor(
    private readonly loadSnapshot: () => Promise<AgentSessionSnapshot>,
    private readonly onChange: (state: AgentSessionReconcilerState) => void = () => undefined,
  ) {}

  refresh(): Promise<AgentSessionSnapshot | null> {
    if (this.inFlight) {
      this.refreshQueued = true
      return this.inFlight
    }

    const requestId = ++this.requestSequence
    this.state.loading = true
    this.state.error = null
    this.emit()
    const request = this.loadSnapshot()
      .then((snapshot) => {
        if (
          requestId >= this.appliedSequence &&
          (!this.state.snapshot || snapshot.revision >= this.state.snapshot.revision)
        ) {
          this.appliedSequence = requestId
          this.state.snapshot = snapshot
          this.emit()
        }
        return this.state.snapshot
      })
      .catch((error: unknown) => {
        if (requestId >= this.appliedSequence) {
          this.state.error = error
          this.emit()
        }
        return this.state.snapshot
      })
      .finally(() => {
        this.inFlight = null
        this.state.loading = false
        this.emit()
        if (this.refreshQueued) {
          this.refreshQueued = false
          void this.refresh()
        }
      })
    this.inFlight = request
    return request
  }

  invalidate(advertisedRevision?: number): void {
    if (
      advertisedRevision !== undefined &&
      this.state.snapshot &&
      advertisedRevision <= this.state.snapshot.revision
    ) {
      return
    }
    void this.refresh()
  }

  private emit(): void {
    this.onChange({ ...this.state })
  }
}
