//@flow

/*
  We are going to implement our own flux architecture https://facebook.github.io/flux/ inspired by redux http://redux.js.org/docs/introduction/
  and and see how refacoring to patterns https://www.amazon.it/Refactoring-Patterns-Joshua-Kerievsky/dp/0321213351 and some syntax sugar can reduce boilerplate
  mantaining type safety https://flow.org/
*/

// first of all let's see a reducer

export type Reducer<State, Action> = (state: State, action: Action) => State;

// A very simple implementation

type CounterAction = // define possible actions
    { type: 'inc' }
  | { type: 'add', payload: number }
;

type CounterState = number;

const CounterReducer: Reducer<CounterState, CounterAction> = (state, action) => { // implement the logic
  switch (action.type) {
    case 'inc': return state + 1;
    case 'add': return state + action.payload;
    default: throw new Error(`unknown action: ${action.type}`);
  }
}

// That's it, but now we need a mutable object that will retain our state

// A simple observer would be fine

export class Store<State, Action> {
  state: State;
  reducer: (state: State, action: Action) => State;
  replaceReducer(reducer: (state: State, action: Action) => State) { this.reducer = reducer; };
  listeners: Set<(state: State) => void> = new Set;
  constructor(state: State, reducer: (state: State, action: Action) => State) { this.state = state; this.reducer = reducer; }
  publish = (action: Action): void => { this.state = this.reducer(this.state, action); this.notify(); }
  notify() { for (let listener of this.listeners) listener(this.state); }
  subscribe(listener: (state: State) => void): void { this.listeners.add(listener); }
  unsubscribe(listener: (state: State) => void): void { this.listeners.delete(listener); }
}

// As the flux architecture is mostly used with react lets create a high-order component https://facebook.github.io/react/docs/higher-order-components.html to listen to the store
// this https://medium.com/@learnreact/container-components-c0e67432e005 convention will be followed

import React from 'react';

export function connect<State, Action, Props>(
  store: Store<State, Action>,
  component: (props: Props, state: State, publish: (action: Action) => void) => React.Element<*>
): Class<React.Component<void, Props, { state: State }>> {
  return class extends React.Component<void, Props, { state: State }> {
    store: Store<State, Action> = store;
    component: (props: Props, state: State, publish: (action: Action) => void) => React.Element<*> = component;
    state = { state: store.state };
    render() { return this.component(this.props, this.state.state, this.store.publish); }
    listen = (state: State) => this.setState({ state });
    componentWillMount() { this.store.subscribe(this.listen); }
    componentWillUnmount() { this.store.unsubscribe(this.listen); }
  }
}

// We aren't going to use internal state, instead we reify the domain and view state to the store. See also http://elm-lang.org/ architecture

// Example
const counterDemoStore = new Store(0, CounterReducer);
const CounterComponent = (props, state, publish) => <div>
  counter = {state}<br/>
  <button onClick={() => publish({ type: 'inc' })}>inc</button><br/>
</div>;
export const CounterDemo = connect(counterDemoStore, CounterComponent);

// Example with multiple instances

// To split concerns we create a simple stateles dumb component to view data
const CounterViewComponent = ({ count, inc }) => <div>
  counter = {count}<br/>
  <button onClick={inc}>inc</button><br/>
</div>;

// let's create a class just to keep pieces together
class Counter {
  static reducer: Reducer<CounterState, CounterAction> = (state, action) => {
    switch (action.type) {
      case 'inc': return state + 1;
      case 'add': return state + action.payload;
      default: throw new Error(`unknown action: ${action.type}`);
    }
  }
  static inc() { return { type: 'inc' }; }
}

// Then a container component that will connect to the store
const CounterInstanceContainerFactory = ({ instance, View }, state, publish) => {
  const counterState = state[instance];
  const inc = () => publish(inInstanceCounterReducer(instance, Counter.inc()));
  return <View count={counterState} inc={inc}/>
}

const repeatedReducer = (instances: {[key: string]: CounterState}, action: { type: 'counterInstanceAction', payload: { ref: string, action: CounterAction } }) => {
  return { ...instances, [action.payload.ref]: Counter.reducer(instances[action.payload.ref], action.payload.action)}
}

// this is a simple helper action creator
const inInstanceCounterReducer = (ref, action) => ({ type: 'counterInstanceAction', payload: { ref, action } });

// a monkeypatched action creator

const multiCounterDemoStore = new Store({ left: 0, right: 0 }, repeatedReducer);

const MultiCounterComponent = connect(multiCounterDemoStore, CounterInstanceContainerFactory);
export const MultiCounterDemo = () => <div>
  <MultiCounterComponent instance="left" View={CounterViewComponent}/>
  <MultiCounterComponent instance="right" View={CounterViewComponent}/>
</div>;