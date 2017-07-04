import {
  createRecord,
  getRef,
  indexForKey,
  getKey,
  isObject,
  mutations,
} from './utils/index.js'

import * as types from './utils/types.js'

export const firebaseMutations = {}

Object.keys(types).forEach(key => {
  // the { commit, state, type, ...payload } syntax is not supported by buble...
  const type = types[key]
  firebaseMutations[type] = (_, context) => {
    mutations[type](context.state, context)
  }
})

const commitOptions = { root: true }

function bindAsObject ({
  key,
  source,
  cancelCallback,
  commit,
  state,
}) {
  const cb = source.on('value', function (snapshot) {
    commit(types.VUEXFIRE_OBJECT_VALUE, {
      type: types.VUEXFIRE_OBJECT_VALUE,
      key,
      record: createRecord(snapshot),
      state,
    }, commitOptions)
  }, cancelCallback)

  // return the listeners that have been setup
  return { value: cb }
}

function bindAsArray ({
  key,
  source,
  cancelCallback,
  commit,
  state,
}) {
  const initArray = [].concat(state[key])
  const onAdd = source.on('child_added', function (snapshot, prevKey) {
    const array = state[key]
    const index = prevKey ? indexForKey(array, prevKey) + 1 : 0
    commit(types.VUEXFIRE_ARRAY_ADD, {
      type: types.VUEXFIRE_ARRAY_ADD,
      state,
      key,
      index,
      initArray,
      record: createRecord(snapshot),
    }, commitOptions)
  }, cancelCallback)

  const onRemove = source.on('child_removed', function (snapshot) {
    const array = state[key]
    const index = indexForKey(array, getKey(snapshot))
    commit(types.VUEXFIRE_ARRAY_REMOVE, {
      type: types.VUEXFIRE_ARRAY_REMOVE,
      state,
      key,
      index,
    }, commitOptions)
  }, cancelCallback)

  const onChange = source.on('child_changed', function (snapshot) {
    const array = state[key]
    const index = indexForKey(array, getKey(snapshot))
    commit(types.VUEXFIRE_ARRAY_CHANGE, {
      type: types.VUEXFIRE_ARRAY_CHANGE,
      state,
      key,
      index,
      record: createRecord(snapshot),
    }, commitOptions)
  }, cancelCallback)

  const onMove = source.on('child_moved', function (snapshot, prevKey) {
    const array = state[key]
    const index = indexForKey(array, getKey(snapshot))
    var newIndex = prevKey ? indexForKey(array, prevKey) + 1 : 0
    // TODO refactor + 1
    newIndex += index < newIndex ? -1 : 0
    commit(types.VUEXFIRE_ARRAY_MOVE, {
      type: types.VUEXFIRE_ARRAY_MOVE,
      state,
      key,
      index,
      newIndex,
      record: createRecord(snapshot),
    }, commitOptions)
  }, cancelCallback)

  // return the listeners that have been setup
  return {
    child_added: onAdd,
    child_changed: onChange,
    child_removed: onRemove,
    child_moved: onMove,
  }
}

// Firebase binding
const bindings = new WeakMap()

function bind ({
  state,
  commit,
  key,
  source,
  options: {
    cancelCallback,
    readyCallback,
  },
}) {
  if (!isObject(source)) {
    throw new Error('VuexFire: invalid Firebase binding source.')
  }
  if (!(key in state)) {
    throw new Error(`VuexFire: cannot bind undefined property '${key}'. Define it on the state first.`)
  }
  // Unbind if it already exists
  let binding = bindings.get(commit)
  if (!binding) {
    binding = {
      sources: Object.create(null),
      listeners: Object.create(null),
    }
    bindings.set(commit, binding)
  }
  if (key in binding.sources) {
    unbind({ commit, key })
  }
  binding.sources[key] = getRef(source)

  // Automatically detects if it should be bound as an array or as an object
  let listener
  if (state[key] && 'length' in state[key]) {
    listener = bindAsArray({ key, source, cancelCallback, commit, state })
  } else {
    listener = bindAsObject({ key, source, cancelCallback, commit, state })
  }

  binding.listeners[key] = listener

  // Support for SSR
  if (readyCallback) {
    source.once('value', readyCallback)
  }
}

function unbind ({ commit, key }) {
  let binding = bindings.get(commit)
  if (!binding) {
    binding = {
      sources: Object.create(null),
      listeners: Object.create(null),
    }
    bindings.set(commit, binding)
  }
  if (!(key in binding.sources)) {
    throw new Error(`VuexFire: cannot unbind '${key}' because it wasn't bound.`)
  }
  const oldSource = binding.sources[key]
  const oldListeners = binding.listeners[key]
  for (let event in oldListeners) {
    oldSource.off(event, oldListeners[event])
  }
  // clean up
  delete binding.sources[key]
  delete binding.listeners[key]
}

export function firebaseAction (action) {
  return function firebaseEnhancedActionFn (context, payload) {
    // get the local state and commit. These may be bound to a module
    const { state, commit } = context
    context.bindFirebaseRef = (key, source, options = {}) =>
      bind({ state, commit, key, source, options })
    context.unbindFirebaseRef = (key) =>
      unbind({ commit, key })
    return action(context, payload)
  }
}
