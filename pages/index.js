// @flow
// @tscheck

import { Store } from '../src';

const store = new Store(0);

const CounterA = {
  state: () => (s: number) => 0,
  string: (s: string) => (s: number) => 0,
  inc: (n: number) => s => s + n,
  set: (n: number) => (s: number) => n,
}

const Counter = store.algonawt(({ base }, counter, publish) => <span>
  Counting {counter} <button onClick={() => publish(CounterA.inc(base))}>inc {base}</button>
</span>);

export default () => (
  <div>
    <Counter base={3} />
  </div>
)