import {
  VUEXFIRE_OBJECT_VALUE,
  VUEXFIRE_ARRAY_ADD,
  VUEXFIRE_ARRAY_CHANGE,
  VUEXFIRE_ARRAY_MOVE,
  VUEXFIRE_ARRAY_REMOVE,
} from './types.js'

import {
  findIndexWithRecord,
} from './firebase.js'

export const mutations = {
  [VUEXFIRE_OBJECT_VALUE] (state, { key, record }) {
    state[key] = record
  },

  [VUEXFIRE_ARRAY_ADD] (state, { key, index, initArray, record }) {
    if (initArray.length < 1) {
      state[key].splice(index, 0, record)
      return
    }
    const initRecordIndex = findIndexWithRecord(initArray, record)
    initArray.splice(initRecordIndex, 1)
    index = findIndexWithRecord(state[key], record)
    state[key].splice(index, 1, record)
  },

  [VUEXFIRE_ARRAY_CHANGE] (state, { key, index, record }) {
    state[key].splice(index, 1, record)
  },

  [VUEXFIRE_ARRAY_MOVE] (state, { key, index, record, newIndex }) {
    const array = state[key]
    array.splice(newIndex, 0, array.splice(index, 1)[0])
  },

  [VUEXFIRE_ARRAY_REMOVE] (state, { key, index }) {
    state[key].splice(index, 1)
  },
}
