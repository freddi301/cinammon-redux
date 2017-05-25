// @flow

/*
  We are going to implement our own flux architecture https://facebook.github.io/flux/ inspired by redux http://redux.js.org/docs/introduction/
  and and see how refacoring to patterns https://www.amazon.it/Refactoring-Patterns-Joshua-Kerievsky/dp/0321213351 and some syntax sugar can reduce boilerplate
  mantaining type safety https://flow.org/
*/

// first of all let's see a reducer

export type Reducer<State, Action: { +type: string, +payload?: mixed }> = (state: State, action: Action) => State;

// A very simple implementation

type CounterAction = // define possible actions
    { type: 'inc', payload: void }
  | { type: 'add', payload: number }
;

type CounterState = number;

const CounterReducer: Reducer<CounterState, CounterAction> = (state, action) => { // implement the logic
  switch (action.type) {
    case 'inc': return state + 1;
    case 'add': return state + action.payload;
    default: throw new Error(`unknown action`);
  }
}

// That's it, but now we need a mutable object that will retain our state

// A simple observer would be fine

type Publish<Action> = (action: Action) => void;
type Listener<State> = (state: State) => void;

export class Store<State, Action: { +type: string, +payload?: mixed }> {
  state: State;
  reducer: (state: State, action: Action) => State;
  replaceReducer(reducer: (state: State, action: Action) => State) { this.reducer = reducer; };
  listeners: Set<(state: State) => void> = new Set;
  constructor(state: State, reducer: Reducer<State, Action>) { this.state = state; this.reducer = reducer; }
  publish: Publish<Action> = action => { this.state = this.reducer(this.state, action); this.notify(); }
  notify() { for (let listener of this.listeners) listener(this.state); }
  subscribe(listener: Listener<State>): void { this.listeners.add(listener); }
  unsubscribe(listener: Listener<State>): void { this.listeners.delete(listener); }
}

// As the flux architecture is mostly used with react lets create a high-order component https://facebook.github.io/react/docs/higher-order-components.html to listen to the store
// this https://medium.com/@learnreact/container-components-c0e67432e005 convention will be followed

import React from 'react';

export type Connected<Props, State> = Class<React.Component<void, Props, { state: State }>>

export function connect<State, Action: { +type: string, +payload?: mixed }, Props, Component: (props: Props, state: State, publish: Publish<Action>) => React.Element<*>>(
  store: Store<State, Action>,
  component: Component
): Connected<Props, State> {
  return class extends React.Component<void, Props, { state: State }> {
    store: Store<State, Action> = store;
    component: Component = component;
    state = { state: store.state };
    render() { return this.component(this.props, this.state.state, this.store.publish); }
    listen: Listener<State> = state => this.setState({ state });
    componentWillMount() { this.store.subscribe(this.listen); }
    componentWillUnmount() { this.store.unsubscribe(this.listen); }
  }
}

// We aren't going to use internal state, instead we reify the domain and view state to the store. See also http://elm-lang.org/ architecture

// Example
const counterDemoStore = new Store(0, CounterReducer);
const CounterComponent = (props, state, publish) => <div>
  counter = {state}<br/>
  <button onClick={() => publish({ type: 'inc', payload: undefined })}>inc</button><br/>
</div>;
export const CounterDemo: Connected<{}, number> = connect(counterDemoStore, CounterComponent);

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
      default: throw new Error(`unknown action`);
    }
  }
  static inc() { return { type: 'inc', payload: undefined }; }
}

// Then a container component that will connect to the store
const CounterInstanceContainerFactory = ({ instance, View }, state, publish) => {
  const counterState = state[instance];
  const inc = () => publish({ type: 'counterInstanceAction', payload: { ref: instance, action: Counter.inc() } });
  return <View count={counterState} inc={inc}/>
}

const repeatedReducer = (
  instances: {[key: string]: CounterState},
  action: { type: 'counterInstanceAction', payload: { ref: string, action: CounterAction } }
) => ({ ...instances, [action.payload.ref]: Counter.reducer(instances[action.payload.ref], action.payload.action)});


const multiCounterDemoStore = new Store({ left: 0, right: 0 }, repeatedReducer);

const MultiCounterComponent = connect(multiCounterDemoStore, CounterInstanceContainerFactory);
export const MultiCounterDemo = () => <div>
  <MultiCounterComponent instance="left" View={CounterViewComponent}/>
  <MultiCounterComponent instance="right" View={CounterViewComponent}/>
</div>;

// Part 2

// Lets refactor repeatedReducer to something reusable

// define every action on its own

type InstanceReducerActionReduce<State, Action> = { type: 'InstanceAction.reduceInstance', payload: { ref: string, action: Action } };
type InstanceReducerActionCreate<State, Action> = { type: 'InstanceAction.createInstance', payload: { ref: string, state: State } };

// define State and Action type for the new reducer

type InstanceReducerAction<State, Action> = InstanceReducerActionCreate<State, Action> | InstanceReducerActionReduce<State, Action>;
type InstanceReducerState<State> = {[key: string]: State};

// here a class is used only to group things together

export class InstanceReducer<State, Action: { +type: string, +payload?: mixed }> {
  delegate: Reducer<State, Action>;
  constructor(reducer: Reducer<State, Action>) { this.delegate = reducer; }
  // top-down approach first write the effective reducer, a trivial dispatcher with a switch
  reducer = (instances: InstanceReducerState<State>, action: InstanceReducerAction<State, Action>) => {
    switch (action.type) {
      case 'InstanceAction.createInstance': return this.createInstance(instances, action.payload.ref, action.payload.state);
      case 'InstanceAction.reduceInstance': return this.reduceInstance(instances, action.payload.ref, action.payload.action);
      default: throw new Error(`action not supported`);
    }
  }
  // then a trivial schema: basic action creator, action handler
  reduce(ref: string, action: Action) { return { type: 'InstanceAction.reduceInstance', payload: { ref, action } }; }
  reduceInstance(instances: InstanceReducerState<State>, ref: string, action: Action) { return ({ ...instances, [ref]: this.delegate(instances[ref], action)}); }
  create(ref: string, state: State) { return { type: 'InstanceAction.createInstance', payload: { ref, state } }; }
  createInstance(instances: InstanceReducerState<State>, ref: string, state: State) { return ({ ...instances, [ref]: state }); }
}

// If you are asking yourself why so many type annotations, and why some parts uses a larger code form (like switch)
// is's because parametric typing in flow is not as flexible, and this amount of annotations is the necessary evil
// to achieve 100% flow coverage and correctness
// maybe someone more clever than me will find some way to reduce the boilerplate

const instancedCounter: InstanceReducer<CounterState, CounterAction> = new InstanceReducer(Counter.reducer);

const multiCounterDemoStoreInitialState: InstanceReducerState<CounterState> = { left: 5, right: 10 };
const multiCounterDemoStore2 = new Store(multiCounterDemoStoreInitialState, instancedCounter.reducer);

const CounterInstanceContainerFactory2 = ({ instance, View }, state: InstanceReducerState<CounterState>, publish: Publish<*>) => {
  const counterState = state[instance];
  const inc = () => publish(instancedCounter.reduce(instance, Counter.inc()));
  return <View count={counterState} inc={inc}/>
}

const MultiCounterComponent2 = connect(multiCounterDemoStore2, CounterInstanceContainerFactory2);
export const MultiCounterDemo2 = () => <div>
  <MultiCounterComponent2 instance="left" View={CounterViewComponent}/>
  <MultiCounterComponent2 instance="right" View={CounterViewComponent}/>
  <MultiCounterComponent2 instance="left" View={CounterViewComponent}/>
</div>;


// TODO: nesting reducers, exampple { domain: InstancedReducers, view: Windows } 
