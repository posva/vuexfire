import * as Vuex from 'vuex';
import * as firebase from 'firebase';
export declare const firebaseMutations: {
    [key: string]: any;
};
export declare namespace VuexFire {
    interface BindOptions {
        cancelCallback?: Function;
        readyCallback?: ((a: firebase.database.DataSnapshot, b?: string | undefined) => any);
        errorCallback?: Function;
        wait?: Boolean;
    }
    interface ActionContext<S, R> extends Vuex.ActionContext<S, R> {
        bindFirebaseRef: (key: string, source: firebase.database.Reference, options: BindOptions) => void;
        unbindFirebaseRef: (key: string) => void;
    }
}
export declare function firebaseAction(action: (context: VuexFire.ActionContext<any, any>, payload: any) => any): (context: VuexFire.ActionContext<any, any>, payload: any) => any;
