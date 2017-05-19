// @flow

import Head from 'next/head'

import { CounterDemo, MultiCounterDemo } from '../src/story';

export default () => <div>
  <Head>
    <title>Cinammon Redux</title>
    <meta name="viewport" content="initial-scale=1.0, width=device-width" />
    {/*<!-- Google Fonts -->*/}
    <link rel="stylesheet" href="//fonts.googleapis.com/css?family=Roboto:300,300italic,700,700italic"/>
    {/*<!-- CSS Reset -->*/}
    <link rel="stylesheet" href="//cdn.rawgit.com/necolas/normalize.css/master/normalize.css"/>
    {/*<!-- Milligram CSS minified -->*/}
    <link rel="stylesheet" href="//cdn.rawgit.com/milligram/milligram/master/dist/milligram.min.css"/>
  </Head>
  <br/>
  <div className="container">
    <article>
      <h3>Counter</h3>
      <CounterDemo />
    </article>
    <hr/>
    <article>
      <h3>Multi Counter</h3>
      <MultiCounterDemo />
    </article>
  </div>
</div>