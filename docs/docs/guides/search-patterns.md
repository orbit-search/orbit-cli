---
sidebar_position: 1
---

# Search Patterns

Orbit's search is natural language — it understands context, not just keywords. Here are effective patterns for finding people.

## By Name

```bash
orbit search "Jane Smith"
orbit search "Dr. Michael Chen"
```

## By Profession + Location

```bash
orbit search "lawyers in Los Angeles"
orbit search "dentists in Miami"
orbit search "software engineers in Austin"
orbit search "real estate agents in Manhattan"
```

## By Company

Find people associated with a specific company:

```bash
orbit search "engineers at Stripe"
orbit search "founders of Builder.ai"
orbit search "people who worked at Northvolt"
orbit search "Humane AI employees"
orbit search "former Tesla executives"
```

## By Background

Combine education, work history, and other signals:

```bash
orbit search "Stanford engineers who worked at Google"
orbit search "YC founders in fintech"
orbit search "MIT graduates in AI research"
orbit search "people who worked at both Meta and Google"
```

## By Interest

```bash
orbit search "people into rock climbing in Colorado"
orbit search "investors in crypto"
orbit search "founders in the AI space"
```

## Entity-Related Searches

Orbit finds people, not companies. But you can find people *at* or *from* any entity:

```bash
orbit search "people at failed startups"
orbit search "startup founders who pivoted"
orbit search "former Byju's employees"
```

For complex entity queries (like "find people at startups that are currently failing"), combine web research with Orbit:

1. Use web search to identify specific companies
2. Search Orbit for people at each company
3. Profile the interesting results

## Tips

- **Be specific** — "lawyers in LA" works better than just "lawyers"
- **Use `--first`** when you know who you're looking for — skips the list
- **Use `--limit`** to control how many results you get back
- **Match reasons** tell you why someone matched — read them to verify relevance
