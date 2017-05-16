// @flow
// @tscheck

import React from 'react';

function deco<State, Handlers: Object>(handlers: Handlers): $ObjMapi<Handlers, <T, A>(t: T, h: (a: A) => State) => { (args: A): State, type: T, payload: A }> {
  const ret = {};
  for (const type of Object.keys(handlers)) {
    const original = handlers[type];
    const decorated = (arg) => { const curried = original(arg); curried.payload = arg; return curried; }
    decorated.type = type;
    ret[type] = decorated;
  }
  return (handlers: any);
}

export class Store<State> {
  state: State;
  listeners: Set<(state: State) => void> = new Set;
  constructor(state: State) { this.state = state; }
  publish = (action: (state: State) => State): void => {
    const nextState = action(this.state); if (nextState !== this.state) { this.state = nextState; this.notify(); } }
  notify() { for (let listener of this.listeners) listener(this.state); console.log(this.state); }
  subscribe(listener: (state: State) => void): void { this.listeners.add(listener); }
  unsubscribe(listener: (state: State) => void): void { this.listeners.delete(listener); }
  algonawt<Props>(comp: (props: Props, state: State, publish: (action: (state: State) => State) => void) => React.Element<*>): Class<React.Component<void, Props, { algo: State }>> {
    const store = this;
    class Container extends React.Component<void, Props, { algo: State }> {
      state: { algo: State } = { algo: store.state };
      render() { return comp(this.props, this.state.algo, store.publish); }
      subscribe = (state: State) => this.setState({ algo: state });
      componentWillMount() { store.subscribe(this.subscribe) }
      componentWillUnmount() { store.unsubscribe(this.subscribe) }
    }
    return Container;
  }
}