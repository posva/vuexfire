import * as Vuex from 'vuex';
import * as firebase from 'firebase';
export declare const firebaseMutations: Record<string, any>;
export declare namespace VuexFire {
    interface BindOptions {
        /**
         * Cancel callback passed to Firebase when listening for events
         */
        cancelCallback?: Function;

        /**
         * Callback called once the data has been loaded. Useful for SSR
         */
        readyCallback?: ((a: firebase.database.DataSnapshot, b?: string | undefined) => any);

        /**
         * Callback called when there is an error loading the data. Useful for SSR
         */
        errorCallback?: (error: firebase.FirebaseError) => void;

        /**
         * (Arrays only) Should Vuexfire wait for the whole array to be populated. Defaults to true
         */
        wait?: boolean;
    }
    interface ActionContext<S, R> extends Vuex.ActionContext<S, R> {
        /**
         * Binds a firebase reference to a property in the state. If there was already another reference bound to the same property, it unbinds it first.
         */
        bindFirebaseRef: (key: string, source: firebase.database.Reference | firebase.database.Query, options?: BindOptions) => void;

        /**
         * Unbinds a bound firebase reference to a given property in the state.
         */
        unbindFirebaseRef: (key: string) => void;
    }
}
export declare function firebaseAction<S, R>(action: (context: VuexFire.ActionContext<S, R>, payload: any) => any): (context: Vuex.ActionContext<S, R>, payload: any) => any;
