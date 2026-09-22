+++
title = "On Cookies"
date = "2026-09-21T14:13:27-04:00"

+++

Cookies are delicious.  Also, they are mysterious.

For instance, you might think that those delicious cookies are chocolate chip, but no, they are actually raisins.  That's the mysterious part.

Computer cookies operate in the same way.  They allow for information to be passed from your computer to a remote one (that's the delicious part), but you don't know what information is being shared unless you look under the hood (mysterious).

> Ok, the metaphor may not *exactly* hold up in the second scenario, but it's my article and you're just going to have to deal with it.

This article is going to cover two topics:

- What cookies are traditionally used for.
- Why you're asked to confirm or deny cookies.

---

## What Are Cookies

Cookies, also known by the names of HTTP cookie, browser cookie, web cookie, et al., are simply small blocks of data formatted as key-value pairs (this is a bit of an over-simplification).  They are meaningful bits of data to the site itself that may be written to disk, i.e., stored on the hard drive, and are transmitted with each HTTP request if the domain (i.e., www.wikipedia.org), path (/index.html or /about/index.html, etc.), security (`Secure`, `HttpOnly`- whether JavaScript can access the cookie, etc.) and other restrictions, match the stored attributes of the cookie.

> I just use Mozilla Firefox, and so my persistent cookies are physically stored in my home directory in a Mozilla profile (there could be other locations, such as a local database).  But, is much easier to see and manage access to them through Settings in the browser's menu.

Cookies can be set to expire at a certain time and date in the future, and this timestamp is set using the `Expires` or `Max-Age` property.  There are different types of cookies, such as persistent and session cookies, although technically they are all just known as cookies.  Persistent cookies are ones that are saved to disk because they have `Expires` or `Max-Age` set, while session cookies are often lost after the session ends because they don't.

What are key-value pairs?  Here are some examples:

```
name=Margaret
city=Phoenix
occupation=Lawyer
```

Each of those key-value pairs could be considered a cookie, if they were sent individually.  However, often they are all transmitted to a remote server at the same time.  This is one way that web developers use to store information and ensure that a user session "remembers" past requests.  Let's explore this a bit because it helps to understand why cookies were invented.

By design, [HTTP] (HyperText Transfer Protocol) network requests are stateless.  This means that there is nothing inherent in an HTTP request for it to know that you are on the same machine that made the last network request (for example, navigating a website by going to a Product page and then an About page, etc.).  The means by which early web developers were able to "tell" the server that the requests were from the same browser session was usually, but not always, by having a cookie that could provide a certain type of identity, like a [session ID].

> While still used, a predictable, exposed or improperly-managed session ID exposes a user's data and the server to a type of cyberattack known as [session hijacking].

## Accepting Or Rejecting Cookies

Privacy laws are different depending upon the region in which you live.  Let's take two of the most notable ones and briefly look at their policies towards cookies.

The [GDPR] (General Data Protection Regulation) is a privacy regulation enacted by the [EU] (European Union) and applies across it and the [EEA] (European Economic Area) countries.  Additionally, the [ePrivacy Directive] complements the GDPR by strictly enforcing conduct around cookies and establishes clear guidelines about what information can be kept and what can be discarded.  It gives users more control over how their data is collected and used, and it enforces companies to be transparent and justify how *they* use the data.  There are also steep fines for companies that do not adhere to the regulations.

Although this legislation must be adhered to by countries within the EU and EEA, it has global reach.  How does this look when visiting a website?  Well, the acceptance of non-essential cookies is opt-in, and there cannot be any pre-checked boxes.  This is very important, as it means that the server cannot save any non-essential cookies (i.e., cookies that are not needed for the site to function) unless the user accepts the agreement.  Non-essential cookies also cannot be set *before* a user explicitly opts-in, which is very important regarding privacy and marks a crucial difference with United States law, as we will see in a moment.

The GDPR has also imposed steep fines of up to €20 million or 4% of annual turnover, whichever is greater, for certain privacy violations (i.e., not necessarily cookies).  The Europeans are not playing.

Now, the United States, on the other hand, does not have strong privacy laws like the EU and the EEA.  In marked contrast, the US has a policy of opt-out, which means that non-essential cookies *can* be collected until the user explicitly opts out.  The financial penalties are not as steep as those in the EU, and because of this companies don't have as much incentive to prioritize a user's privacy.

In addition, the regulation is patchy, because the federal government has passed no singular comprehensive privacy law, rather leaving it to the individual states to implement their own privacy laws.

> Take note that both the United States federal government agencies and European national governments can access user data for surveillance purposes under current laws.

## References

- [HTTP]
- [HTTP cookie]
- [session hijacking]
- [GDPR]
- [ePrivacy Directive]

[HTTP cookie]: https://en.wikipedia.org/wiki/HTTP_cookie
[HTTP]: https://en.wikipedia.org/wiki/HTTP
[session ID]: https://en.wikipedia.org/wiki/Session_ID
[session hijacking]: https://en.wikipedia.org/wiki/Session_hijacking
[GDPR]: https://en.wikipedia.org/wiki/General_Data_Protection_Regulation
[EU]: https://en.wikipedia.org/wiki/European_Union
[EEA]: https://en.wikipedia.org/wiki/European_Economic_Area
[ePrivacy Directive]: https://en.wikipedia.org/wiki/EPrivacy_Directive

