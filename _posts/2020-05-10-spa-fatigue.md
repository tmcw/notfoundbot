---
layout: post
title: Second-guessing the modern web
description: "What if everyone's wrong?"
image: 
categories:
  - blog

---

The emerging norm for web development is to build a React single-page application, with server rendering. The two key elements of this architecture are something like:

1. The main UI is built & updated in JavaScript using React or something similar.
2. The backend is an API that that application makes requests against.

This idea has really swept the internet. It started with a few major popular websites and has crept into corners like marketing sites and blogs.

I'm increasingly skeptical of it.

There is a sweet spot of React: in moderately interactive interfaces. Complex forms that require immediate feedback, UIs that need to move around and react instantly. That's where it excels. I helped build the editors in [Mapbox Studio](https://www.mapbox.com/mapbox-studio/) and [Observable](https://observablehq.com/) and for the most part, React was a great choice.

But there's a lot on either side of that sweet spot.

The high performance parts aren't React. [Mapbox GL](https://docs.mapbox.com/mapbox-gl-js/api/), for example, is vanilla JavaScript and probably should be forever. The level of abstraction that React works on is too high, and the cost of using React - in payload, parse time, and so on - is too much for any company to include it as part of an SDK. Same with the [Observable runtime](https://github.com/observablehq/runtime), the juicy center of that product: it's very performance-intensive and would barely benefit from a port.

The less interactive parts don't benefit much from React. Listing pages, static pages, blogs - these things are increasingly built in React, but the benefits they accrue are extremely narrow. A lot of the optimizations we're deploying to speed up these things, things like bundle splitting, server-side rendering, and prerendering, are triangulating what we had before the rise of React.

And they're kind of messy optimizations. Here are some examples.

### Bundle splitting.

As your React application grows, the application bundle grows. Unlike with a traditional multi-page app, that growth affects _every visitor_: you download the whole app the first time that you visit it. At some point, this becomes a real problem. Someone who lands on the About page is also downloading 20 other pages in the same application bundle. Bundle splitting 'solves' this problem by creating many JavaScript bundles that can lazily load each other. So you load the About page and what your browser downloads is an 'index' bundle, and then that 'index' bundle loads the 'about page' bundle.

This _sort of_ solves the problem, but it's not great. Most bundle splitting techniques require you to load that 'index bundle', and then only once that JavaScript is loaded and executed does your browser know which 'page bundle' it needs. So you need two round-trips to start rendering.

And then there's the question of updating code-split bundles. User sessions are surprisingly long: someone might have your website open in a tab for weeks at a time. I've seen it happen. So if they open the 'about page', keep the tab open for a week, and then request the 'home page', then the home page that they request is dictated by _the index bundle that they downloaded last week_. This is a deeply weird and under-discussed situation. There are essentially two solutions to it:

1. You keep all generated JavaScript around, forever, and people will see the version of the site that was live at the time of their first page request.
2. You create a system that alerts users when you've deployed a new version of the site, and prompt them to reload.

The first solution has a drawback that might not be immediately obvious. In those intervening weeks between loading the site and clicking a link, you might've deployed a new API version. So the user will be using an old version of your JavaScript frontend with a new version of your API backend, and they'll trigger errors that none of your testing knows about, because you'll usually be testing current versions of each.

And the second solution, while it works (and is what we implemented for Mapbox Studio), is a bizarre way for a web application to behave. Prompting users to 'update' is something from the bad old days of desktop software, not from the shiny new days of the web.

Sure: traditional non-SPA websites are not immune to this pitfall. Someone might load your website, have a _form_ open for many weeks, and then submit it after their session expired or the API changed. But that's a much more limited exposure to failure than in the SPA case.

### Server-Side Rendering

Okay, so the theory here is that SPAs are initially a blank page, which is then filled out by React & JavaScript. That's bad for performance: HTML pages don't _need_ to be blank initially. So, Server-Side Rendering runs your JavaScript frontend code on the backend, creating a filled-out HTML page. The user loads the page, which now has pre-rendered content, and then the JavaScript loads and makes the page interactive.

A great optimization, but again, caveats.

The first is that the page you initially render is dead: you've created the [Time To Interactive](https://web.dev/interactive/) metric. It's your startup's homepage, and it has a "Sign up" button, but until the JavaScript loads, that button doesn't do anything. So you need to compensate. Either you omit some interactive elements on load, or you try really hard to make sure that the JavaScript loads faster than users will click, or you make some elements not require JavaScript to work - like making them normal links or forms. Or some combination of those.

And then there's the authentication story. If you do SSR on any pages that are custom to the user, then you need to forward any cookies or authentication-relevant information to your API backend and make sure that you never cache the server-rendered result. Your formerly-lightweight application server is now doing quite a bit of labor, running React & making API requests in order to do this pre-rendering.

### APIs

The dream of APIs is that you have generic, flexible endpoints upon which you can build any web application. That idea breaks down pretty fast.

Most interactive web applications start to triangulate on "one query per page." API calls being generic or reusable never seems to persist as a value in infrastructure. This is because a large portion of web applications are, at their core, query & transformation interfaces on top of databases. The hardest performance problems they tend to have are query problems and transfer problems.

For example: a generically-designed REST API that tries not to mix 'concerns' will produce a frontend application that has to make lots of requests to display a page. And then a new-age GraphQL application will suffer under the [N+1 query problem](https://shopify.engineering/solving-the-n-1-problem-for-graphql-through-batching) at the database level until an optimization arrives. And a traditional "make a query and put it on a page" application will just, well, try to write some good queries.

None of these solutions are silver bullets: I've worked with overly-strict REST APIs, optimization-hungry GraphQL APIs, and hand-crafted SQL APIs. But no option really lets a web app be careless about its data-fetching layer. Web applications can't sit on top of independently-designed APIs: to have a chance at performance, the application and its datasource need to be designed as one.

### Data fetching

Speaking of data fetching. It's really important and really bizarre in React land. Years ago, I expected that some good patterns would emerge. Frankly, they didn't.

There are decent patterns in the form of GraphQL, but for a React component that loads data with fetch from an API, the solutions have only gotten weirder. There's great documentation for everything else, but old-fashioned data loading is relegated to one example of how to mock out 'fetch' for testing, and lots of Medium posts of varying quality.

---

Don't read this as anti-React. I still think React is pretty great, and for a particular set of use cases it's the best tool you can find. And I explicitly want to say that – from what I've seen – most other Single-Page-Application tools share most of these problems. They're issues with the pattern, not the specific frameworks used to implement it. React alternatives have some great ideas, and they might be better, but they are ultimately really similar.

But I'm at the point where I look at where the field is and what the alternative patterns are – taking a second look at unloved, unpopular, uncool things like Django, Rails, Laravel – and think _what the heck is happening_. We're layering optimizations upon optimizations in order to get the SPA-like pattern to fit every use case, and I'm not sure that it is, well, worth it.

**And it should be easy to do a good job.**

Frameworks should lure people into the [pit of success](https://blog.codinghorror.com/falling-into-the-pit-of-success/), where following the normal rules and using normal techniques is the winning approach.

I don't think that React, in this context, really is that pit of success. A naïvely implemented React SPA isn't stable, or efficient, and it doesn't naturally scale to significant complexity.

You can add optimizations on top of it that fix those problems, or you can use a framework like Next.js that will include those optimizations by default. That'll help you get pretty far. But then you'll be lured by all of the easy one-click ways to add bloat and complexity. You'll be responsible for keeping some of these complex, finicky optimizations working properly.

And for what? Again - there is a swath of use cases which would be hard without React and which aren't complicated enough to push beyond React's limits. But there are also a _lot_ of problems for which I can't see any concrete benefit to using React. Those are things like blogs, shopping-cart-websites, mostly-[CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete)-and-forms-websites. For these things, all of the fancy optimizations are trying to get you closer to _the performance you would've gotten if you just hadn't used so much technology_.

I can, for example, guarantee that this blog is faster than _any Gatsby blog_ (and much love to the Gatsby team) because there is nothing that a React static site can do that will make it faster than a non-React static site.

---

But the cultural tides are _strong_. Building a company on Django in 2020 seems like the equivalent of driving a PT Cruiser and blasting Faith Hill's "Breathe" on a CD while your friends are listening to The Weeknd in their Teslas. Swimming against this current isn't easy, and not in a trendy contrarian way.

I don't think that everyone's using the SPA pattern for no reason. For large corporations, it allows teams to work independently: the "frontend engineers" can "consume" "APIs" from teams that probably work in a different language and can only communicate through the hierarchy. For heavily interactive applications, it has real benefits in modularity, performance, and structure. And it's beneficial for companies to shift computing requirements from their servers to their customers browsers: a real win for reducing their spend on infrastructure.

But I think there are a lot of problems that are better solved some other way. There's no category winner like React as an alternative. Ironically, backends are churning through technology even faster than frontends, which have been loyal to one programming language for decades. There are some age-old technologies like Rails, Django, and Laravel, and there are a few halfhearted attempts to do templating and "serve web pages" from Go, Node, and other new languages. If you go this way, you're beset by the cognitive dissonance of following in the footsteps of enormous projects - Wikipedia rendering web pages in PHP, Craigslist rendering webpages in Perl - but being far outside the norms of _modern web development_. If Wikipedia were started today, it'd be React. Maybe?

What if everyone's wrong? We've been wrong before.

<details>
<summary>Follow-ups &amp; commmentary</summary>

<ul>
  <li><a href='https://dev.to/richharris/in-defense-of-the-modern-web-2nia'>"In defense of the modern web", Rich Harris</a></li>
  <li><a href='https://dev.to/devplebs/friday-night-deploys-22-a-brief-discussion-on-the-state-of-the-modern-web-2961'>Friday Night Deploys (Podcast) #22: A Brief Discussion On The State Of The Modern Web</a></li>
  <li><a href='https://frontendfirst.fm/episodes/read-and-discuss-second-guessing-the-modern-web'>Frontend First (Podcast): Read &amp; Discuss</a></li>
  <li><a href='https://medium.com/@kevinkirchner/a-ready-to-try-concept-in-response-to-second-guessing-the-modern-web-6946ec4d0598'>A Ready-To-Try Concept in Response to “Second-guessing the modern web”</a></li>
</ul>

</details>
