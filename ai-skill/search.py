#!/usr/bin/env python3
"""
tiny-erp-client AI skill search tool.

Search the tiny-erp-client documentation CSV to answer questions about the library
without loading the full documentation into context.

Usage:
    python search.py <query> [--limit N] [--topic TOPIC]

Examples:
    python search.py "how to create an order"
    python search.py "getStock"
    python search.py "OrderCustomer fields"
    python search.py "freight" --topic orders
    python search.py "stock" --limit 5
"""

import csv
import sys
import os
import argparse
import re

CSV_PATH = os.path.join(os.path.dirname(__file__), "tiny-erp-client.csv")


def load_rows() -> list[dict]:
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def score_row(row: dict, terms: list[str]) -> int:
    """Return a relevance score for a row given search terms."""
    text = " ".join(row.values()).lower()
    score = 0
    for term in terms:
        term = term.lower()
        # Exact matches in key fields score higher
        if term in row["topic"].lower():
            score += 4
        if term in row["subtopic"].lower():
            score += 4
        if term in row["description"].lower():
            score += 3
        if term in row["signature"].lower():
            score += 2
        if term in row["example"].lower():
            score += 2
        if term in row["notes"].lower():
            score += 1
        # General match anywhere
        if term in text:
            score += 1
    return score


def format_row(row: dict, index: int) -> str:
    lines = [f"[{index}] {row['topic']} / {row['subtopic']}"]
    lines.append(f"  {row['description']}")
    if row["signature"]:
        lines.append(f"  Signature: {row['signature']}")
    if row["example"]:
        lines.append(f"  Example:   {row['example']}")
    if row["notes"]:
        lines.append(f"  Notes:     {row['notes']}")
    return "\n".join(lines)


def search(query: str, topic_filter: str | None, limit: int) -> None:
    rows = load_rows()

    # Filter by topic if provided
    if topic_filter:
        rows = [r for r in rows if topic_filter.lower() in r["topic"].lower()]

    # Tokenize query
    terms = re.split(r"\s+", query.strip())

    # Score and sort
    scored = [(score_row(r, terms), r) for r in rows]
    scored.sort(key=lambda x: x[0], reverse=True)

    # Filter zero-score results
    results = [(score, row) for score, row in scored if score > 0]

    if not results:
        print(f"No results found for: {query!r}")
        return

    results = results[:limit]
    print(f"Found {len(results)} result(s) for: {query!r}\n")
    for i, (score, row) in enumerate(results, start=1):
        print(format_row(row, i))
        print()


def list_topics() -> None:
    rows = load_rows()
    topics: dict[str, set[str]] = {}
    for row in rows:
        topics.setdefault(row["topic"], set()).add(row["subtopic"])
    print("Available topics:\n")
    for topic, subtopics in sorted(topics.items()):
        print(f"  {topic}: {', '.join(sorted(subtopics))}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Search tiny-erp-client documentation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("query", nargs="?", help="Search query")
    parser.add_argument("--limit", "-n", type=int, default=10, help="Max results (default: 10)")
    parser.add_argument("--topic", "-t", help="Filter by topic (e.g. products, orders, type, errors)")
    parser.add_argument("--list-topics", action="store_true", help="List all available topics and subtopics")

    args = parser.parse_args()

    if args.list_topics:
        list_topics()
        return

    if not args.query:
        parser.print_help()
        sys.exit(1)

    search(args.query, args.topic, args.limit)


if __name__ == "__main__":
    main()
