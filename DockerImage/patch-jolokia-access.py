#!/usr/bin/env python3
"""Adapt ActiveMQ's restrictive Jolokia policy for AMQC.

ActiveMQ 6.3.3 ships a deny-by-default conf/jolokia-access.xml:

  * only POST is allowed, while AMQC also reads via GET;
  * ``exec`` is not listed in ``<commands>``, so every exec operation must be
    explicitly present in ``<allow>``;
  * CORS uses a non-empty allow-origin list with strict checking, so the
    backend must send an allowed Origin (server/main.py sends
    ``http://localhost:8161``).

This script keeps the stock deny list intact and only opens the operations the
AMQC UI actually uses.
"""
from pathlib import Path
import sys


def insert_after(xml: str, marker: str, label: str, operations: list[str]) -> str:
    block_marker = f"<!-- AMQC {label} operations -->"
    if block_marker in xml:
        return xml
    if marker not in xml:
        raise SystemExit(f"Could not find {label} marker in jolokia-access.xml: {marker}")
    snippet = block_marker + "\n" + "\n".join(
        f"      <operation>{operation}</operation>" for operation in operations
    )
    return xml.replace(marker, marker + "\n" + snippet, 1)


def main() -> None:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "/opt/activemq/conf/jolokia-access.xml")
    xml = path.read_text()

    # AMQC reads broker state with GET as well as POST.
    if "<method>get</method>" not in xml:
        if "<method>post</method>" not in xml:
            raise SystemExit("Could not find <method>post</method> in jolokia-access.xml")
        xml = xml.replace(
            "<method>post</method>",
            "<method>post</method>\n    <method>get</method>",
            1,
        )

    # Broker: queue/topic and durable-subscription management.
    xml = insert_after(
        xml,
        "<operation>getTransportConnectorByType(java.lang.String)</operation>",
        "broker",
        ["addQueue*", "removeQueue*", "addTopic*", "removeTopic*", "createDurableSubscriber*"],
    )

    # Destinations: browse, purge, delete-message and statistics reset.
    xml = insert_after(
        xml,
        "<operation>getMessage(java.lang.String)</operation>",
        "destination",
        ["purge*", "removeMessage*", "resetStatistics*"],
    )

    # Consumers: delete a durable subscription.
    xml = insert_after(
        xml,
        "<operation>isMatchingTopic(java.lang.String)</operation>",
        "consumer",
        ["destroy*"],
    )

    path.write_text(xml)


if __name__ == "__main__":
    main()
