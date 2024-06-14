type Requester = {
  id: string
  code: string
  targetIds: string[]
}

type Target = {
  id: string
  type: 'text'
  requesterIds: string[]
}

export class Graph {
  requesterMap: Map<string, Requester>
  targetMap: Map<string, Target>

  constructor() {
    this.requesterMap = new Map()
    this.targetMap = new Map()
  }

  addDependencyByRequester(
    requester: Requester,
    { targetType }: { targetType: 'text' } = { targetType: 'text' },
  ) {
    if (!requester.targetIds.length) {
      throw new Error('targetIds must not be empty')
    }
    this.setRequester(requester)

    requester.targetIds.forEach((targetId) => {
      const targetFile = this.targetMap.get(targetId)
      if (!targetFile) {
        this.setTarget({
          id: targetId,
          type: targetType,
          requesterIds: [requester.id],
        })
      }
      else {
        targetFile.requesterIds.push(requester.id)
      }
    })
  }

  removeDependencyByRequesterId(requesterId: Requester['id']) {
    const requester = this.requesterMap.get(requesterId)
    if (!requester) {
      return
    }
    this.requesterMap.delete(requester.id)

    requester.targetIds.forEach((targetId) => {
      const target = this.targetMap.get(targetId)
      if (!target) {
        return
      }
      const idx = target.requesterIds.findIndex(
        requesterId => requesterId === requester.id,
      )
      target.requesterIds.splice(idx, 1)
      if (!target.requesterIds.length) {
        this.targetMap.delete(target.id)
      }
    })
  }

  getTargetById(targetId: Target['id']) {
    return this.targetMap.get(targetId)
  }

  getRequesterById(requesterId: Requester['id']) {
    return this.requesterMap.get(requesterId)
  }

  protected setRequester(requester: Requester) {
    this.requesterMap.set(requester.id, requester)
  }

  protected setTarget(target: Target) {
    this.targetMap.set(target.id, target)
  }
}
