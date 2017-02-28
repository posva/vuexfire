exports.isKeyInState = function isKeyInState (state, module, key) {
  return (module
    ? walkObject(state, module.split('/'))[key]
    : state[key]) !== undefined
}

exports.get = function get (state, module, key) {
  return module
    ? walkObject(state, module.split('/'))[key]
    : state[key]
}

exports.getMutationName = function getMutationName (module, mutation) {
  return module
    ? module + '/' + mutation
    : mutation
}

exports.initModuleKeyInState = function initModuleKeyInState (state, module) {
  return state = module
    ? walkObject(state, module.split('/'))
    : state
}

function walkObject (obj, keys) {
  return keys.reduce(function (target, key) {
    return target[key]
  }, obj)
}
