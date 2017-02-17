var utils = require('./utils')

const VUEXFIRE_OBJECT_VALUE = 'VUEXFIRE/objectValue'
const VUEXFIRE_ARRAY_CHANGE = 'VUEXFIRE/arrayChange'
const VUEXFIRE_ARRAY_ADD = 'VUEXFIRE/arrayAdd'
const VUEXFIRE_ARRAY_REMOVE = 'VUEXFIRE/arrayRemove'
const VUEXFIRE_ARRAY_MOVE = 'VUEXFIRE/arrayMove'

/**
 * Returns the key of a Firebase snapshot across SDK versions.
 *
 * @param {FirebaseSnapshot} snapshot
 * @return {string|null}
 */
function _getKey (snapshot) {
  return typeof snapshot.key === 'function'
  /* istanbul ignore next: Firebase 2.x */
    ? snapshot.key()
    : snapshot.key
}

/**
 * Returns the original reference of a Firebase reference or query across SDK versions.
 *
 * @param {FirebaseReference|FirebaseQuery} refOrQuery
 * @return {FirebaseReference}
 */
function _getRef (refOrQuery) {
  /* istanbul ignore if: Firebase 2.x */
  if (typeof refOrQuery.ref === 'function') {
    refOrQuery = refOrQuery.ref()
    /* istanbul ignore else: Fallback */
  } else if (typeof refOrQuery.ref === 'object') {
    refOrQuery = refOrQuery.ref
  }

  return refOrQuery
}

/**
 * Check if a value is an object.
 *
 * @param {*} val
 * @return {boolean}
 */
function isObject (val) {
  return Object.prototype.toString.call(val) === '[object Object]'
}

/**
 * Convert firebase snapshot into a bindable data record.
 *
 * @param {FirebaseSnapshot} snapshot
 * @return {Object}
 */
function createRecord (snapshot) {
  var value = snapshot.val()
  var res = isObject(value)
    ? value
    : { '.value': value }
  res['.key'] = _getKey(snapshot)
  return res
}

/**
 * Find the index for an object with given key.
 *
 * @param {array} array
 * @param {string} key
 * @return {number}
 */
function indexForKey (array, key) {
  for (var i = 0; i < array.length; i++) {
    if (array[i]['.key'] === key) {
      return i
    }
  }
  /* istanbul ignore next: Fallback */
  return -1
}

/**
 * Bind a firebase data source to a key on a vm.
 *
 * @param {Vue} vm
 * @param {string} key
 * @param {object} source
 */
function bind (vm, fullKey, source) {
  var asObject = false
  var cancelCallback = null
  var module = utils.modules.getModuleFromKey(fullKey)
  var key = utils.modules.getKey(fullKey)
  // check { source, asArray, cancelCallback } syntax
  if (isObject(source) && source.hasOwnProperty('source')) {
    asObject = source.asObject
    cancelCallback = source.cancelCallback
    source = source.source
  }
  if (!isObject(source)) {
    throw new Error('VuexFire: invalid Firebase binding source.')
  }
  if (!utils.vuex.isKeyInState(vm.$store.state, module, key)) {
    // TODO better error if module
    throw new Error(
      'VuexFire: bind failed: "' + (module && module + '/' || '') + key + '" is not defined in the store state'
    )
  }
  var ref = _getRef(source)

  vm.$firebaseRefs[fullKey] = ref
  vm._firebaseSources[fullKey] = source
  // bind based on initial value type
  if (asObject) {
    bindAsObject(vm, fullKey, module, key, source, cancelCallback)
  } else {
    bindAsArray(vm, fullKey, module, key, source, cancelCallback)
  }
}

/**
 * Bind a firebase data source to a key on a vm as an Array.
 *
 * @param {Vue} vm
 * @param {string} module
 * @param {string} key
 * @param {object} source
 * @param {function|null} cancelCallback
 */
function bindAsArray (vm, fullKey, module, key, source, cancelCallback) {
  var state = vm.$store.state
  // set it as an array
  if (module) {
    utils.vuex.initWithValue(state, module, key, [])
  } else {
    vm.$store.commit(utils.vuex.getMutationName(module, VUEXFIRE_OBJECT_VALUE), {
      key: key,
      record: []
    })
  }

  const onAdd = source.on('child_added', function (snapshot, prevKey) {
    const array = utils.vuex.get(state, module, key)
    const index = prevKey ? indexForKey(array, prevKey) + 1 : 0
    vm.$store.commit(utils.vuex.getMutationName(module, VUEXFIRE_ARRAY_ADD), {
      key: key,
      index: index,
      record: createRecord(snapshot)
    })
  }, cancelCallback)

  const onRemove = source.on('child_removed', function (snapshot) {
    const array = utils.vuex.get(state, module, key)
    const index = indexForKey(array, _getKey(snapshot))
    vm.$store.commit(utils.vuex.getMutationName(module, VUEXFIRE_ARRAY_REMOVE), {
      key: key,
      index: index
    })
  }, cancelCallback)

  const onChange = source.on('child_changed', function (snapshot) {
    const array = utils.vuex.get(state, module, key)
    const index = indexForKey(array, _getKey(snapshot))
    vm.$store.commit(utils.vuex.getMutationName(module, VUEXFIRE_ARRAY_CHANGE), {
      key: key,
      index: index,
      record: createRecord(snapshot)
    })
  }, cancelCallback)

  const onMove = source.on('child_moved', function (snapshot, prevKey) {
    const array = utils.vuex.get(state, module, key)
    const index = indexForKey(array, _getKey(snapshot))
    var newIndex = prevKey ? indexForKey(array, prevKey) + 1 : 0
    // TODO refactor + 1
    newIndex += index < newIndex ? -1 : 0
    vm.$store.commit(utils.vuex.getMutationName(module, VUEXFIRE_ARRAY_MOVE), {
      key: key,
      index: index,
      newIndex: newIndex,
      record: createRecord(snapshot)
    })
  }, cancelCallback)

  vm._firebaseListeners[fullKey] = {
    child_added: onAdd,
    child_removed: onRemove,
    child_changed: onChange,
    child_moved: onMove
  }
}

/**
 * Bind a firebase data source to a key on a vm as an Object.
 *
 * @param {Vue} vm
 * @param {string} key
 * @param {Object} source
 * @param {function|null} cancelCallback
 */
function bindAsObject (vm, fullKey, module, key, source, cancelCallback) {
  const cb = source.on('value', function (snapshot) {
    vm.$store.commit(utils.vuex.getMutationName(module, VUEXFIRE_OBJECT_VALUE), {
      key: key,
      record: createRecord(snapshot)
    })
  }, cancelCallback)
  vm._firebaseListeners[fullKey] = { value: cb }
}

/**
 * Unbind a firebase-bound key from a vm.
 *
 * @param {Vue} vm
 * @param {string} key
 */
function unbind (vm, key) {
  var module = utils.modules.getModuleFromKey(key)
  var source = vm._firebaseSources && vm._firebaseSources[key]
  if (!source) {
    throw new Error(
      'VuexFire: unbind failed: "' + key + '" is not bound to ' +
        'a Firebase reference.'
    )
  }
  vm.$store.commit(utils.vuex.getMutationName(module, VUEXFIRE_OBJECT_VALUE), {
    key: key,
    record: null
  })
  const listeners = vm._firebaseListeners[key]
  for (var event in listeners) {
    source.off(event, listeners[event])
  }
  vm.$firebaseRefs[key] = null
  vm._firebaseSources[key] = null
  vm._firebaseListeners[key] = null
}

/**
 * Ensure the related bookkeeping variables on an instance.
 *
 * @param {Vue} vm
 */
function ensureRefs (vm) {
  if (!vm.$firebaseRefs) {
    vm.$firebaseRefs = Object.create(null)
    vm._firebaseSources = Object.create(null)
    vm._firebaseListeners = Object.create(null)
    if (!vm.$store) {
      throw new Error('VuexFire: missing Vuex. Install Vuex before VuexFire')
    }

    /* istanbul ignore if: Vuex 1 */
    if (!vm.$store.commit) {
      setupMutations(vm.$store)
      vm.$store.commit = vm.$store.dispatch
    }
  }
}

const VuexFireMixin = {
  beforeDestroy: function () {
    if (!this.$firebaseRefs) return
    for (var key in this.$firebaseRefs) {
      if (this.$firebaseRefs[key]) {
        this.$unbind(key)
      }
    }
    this.$firebaseRefs = null
    this._firebaseSources = null
    this._firebaseListeners = null
  },
  created: function () {
    var bindings = this.$options.firebase
    if (typeof bindings === 'function') bindings = bindings.call(this)
    if (!bindings) return
    ensureRefs(this)
    // TODO check for bindings in store
    for (var key in bindings) {
      bind(this, key, bindings[key])
    }
  }
}

function install (Vue) {
  Vue.mixin(VuexFireMixin)

  // use object-based merge strategy
  const mergeStrats = Vue.config.optionMergeStrategies
  mergeStrats.firebase = mergeStrats.methods

  // extend instance methods
  Vue.prototype.$bindAsObject = function (key, source, cancelCallback) {
    ensureRefs(this)
    bind(this, key, {source: source, asObject: true, cancelCallback: cancelCallback})
  }

  Vue.prototype.$bindAsArray = function (key, source, cancelCallback) {
    ensureRefs(this)
    bind(this, key, {source: source, cancelCallback: cancelCallback})
  }

  Vue.prototype.$unbind = function (key) {
    unbind(this, key)
  }
}

install.mutations = {}
install.mutations[VUEXFIRE_OBJECT_VALUE] = function (state, payload) {
  state[payload.key] = payload.record
}

install.mutations[VUEXFIRE_ARRAY_CHANGE] = function (state, payload) {
  state[payload.key].splice(payload.index, 1, payload.record)
}

install.mutations[VUEXFIRE_ARRAY_ADD] = function (state, payload) {
  state[payload.key].splice(payload.index, 0, payload.record)
}

install.mutations[VUEXFIRE_ARRAY_REMOVE] = function (state, payload) {
  state[payload.key].splice(payload.index, 1)
}

install.mutations[VUEXFIRE_ARRAY_MOVE] = function (state, payload) {
  const array = state[payload.key]
  array.splice(payload.newIndex, 0, array.splice(payload.index, 1)[0])
}

/**
 * Setup mutations for a module (Vuex 2)
 *
 * @param {String} module
 */
install.moduleMutations = function moduleMutations (module) {
  return Object.keys(install.mutations).reduce(function (mutations, m) {
    mutations[module.replace('.', '/') + '/' + m] = install.mutations[m]
    return mutations
  }, {})
}

/**
 * Setup mutations for Vuex 1
 *
 * @param {VueStore} store
 */
/* istanbul ignore next: Vuex 1 */
function setupMutations (store) {
  for (var key in install.mutations) {
    store._mutations[key] = install.mutations[key]
  }
}

module.exports = install

/* istanbul ignore if: only works when using <script/> */
if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue)
}
