# Vuexfire [![Build Status](https://img.shields.io/circleci/project/posva/vuexfire.svg)](https://circleci.com/gh/posva/vuexfire) [![npm package](https://img.shields.io/npm/v/vuexfire.svg)](https://www.npmjs.com/package/vuexfire) [![coverage](https://img.shields.io/codecov/c/github/posva/vuexfire.svg)](https://codecov.io/github/posva/vuexfire)

> Firebase binding for [Vuex](https://github.com/vuejs/vuex)

This is heavily inspired from [vuefire](https://github.com/vuejs/vuefire).

Supports:

- Vue 1/2 with Vuex 1
- Vue 2 with Vuex 2

## Installation

1. If included as global `<script>`: will install automatically if global `Vue`
   is present.

  ``` html
  <head>
    <!-- Vue -->
    <script src="https://unpkg.com/vue/dist/vue.js"></script>
    <!-- Vuex -->
    <script src="https://unpkg.com/vuex/dist/vuex.js"></script>
    <!-- Firebase -->
    <script src="https://gstatic.com/firebasejs/3.5.2/firebase.js"></script>
    <!-- VuexFire -->
    <script src="https://unpkg.com/vuexfire/dist/vuexfire.js"></script>
  </head>
  ```

2. In module environments, e.g CommonJS:

  ``` bash
  npm install vue vuex firebase vuexfire --save
  ```

  ``` js
  var Vue = require('vue')
  var Vuex = require('vuex')
  var VuexFire = require('vuexfire')
  var Firebase = require('firebase')

  // explicit installation required in module environments
  Vue.use(Vuex)
  Vue.use(VuexFire)
  ```

## Usage

When binding

### Vuex v1

``` js
var store = new Vuex.Store({
  state: {
    items: null // items must be declared on the state
  }
},
// actions, mutations, etc
)

new Vue({
  el: '#app',
  store: store,
  vuex: {
    getters: {
      items: function (state) { return state.items }
    }
  },
  firebase: {
    items: db.ref('items') // bind as an array
  }
})
```

### Vuex v2

Setup mutations

``` js
var store = new Vuex.Store({
  state: {
    items: null
  },
  mutations: VuexFire.mutations,
  getters: {
    items: function (state) { return state.items }
  }
})

new Vue({
  el: '#app',
  store: store,
  computed: Vuex.mapGetters([
    'items'
  ]),
  firebase: {
    items: db.ref('items')
  }
})
```

#### Modules

In larger applications you may consider splitting up your store
into [modules](http://vuex.vuejs.org/en/modules.html). If that's your case you
have two options:

- Use the `namespaced` option:
``` js
  // Define a module
  var cart = {
    namespaced: true,
    state: {
      items: null // Initialize the variable
    },
    // Getters receive the cart module state only
    getters: {
      lastItem: function (state) {
        return state.items[state.items.length - 1]
      },
      items: function (state) { return state.items }
    },
    mutations: VuexFire.mutations // They will get prefixed by cart/
  }

  // Create the store
  var store = new Vuex.Store({
    modules: {
      cart: cart
    }
  }

  // Make sure to refer to the cart module when binding
  vm.$bindAsArray('cart.items', itemsRef)
```
- Namespace the mutations manually with the `moduleMutations` helper:
``` js
  var cart = {
    // Everything else is the same
    namespaced: false,
    mutations: VuexFire.moduleMutations('cart') // This is the name given to the store
  }

  // Make sure to refer to the cart module when binding
  vm.$bindAsArray('cart.items', itemsRef)
```

Everything else works just as [vuefire](https://github.com/vuejs/vuefire). Refer
to its readme for more documentation.

### Examples

You can checkout the examples by serving an `http-server` at the root of this
project.

## Support on Beerpay
Hey dude! Help me out for a couple of :beers:!

[![Beerpay](https://beerpay.io/posva/vuexfire/badge.svg?style=beer-square)](https://beerpay.io/posva/vuexfire)  [![Beerpay](https://beerpay.io/posva/vuexfire/make-wish.svg?style=flat-square)](https://beerpay.io/posva/vuexfire?focus=wish)
