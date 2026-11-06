#!/usr/bin/env python3
"""Re-enable ActiveMQ's REST MessageServlet for AMQC's Send tab.

ActiveMQ 6.3.3 ships webapps/api/WEB-INF/web.xml with the (deprecated)
MessageServlet commented out. AMQC uses POST /api/message/{destination} to
send messages, so restore the servlet and its mapping while leaving the rest
of web.xml untouched.
"""
from pathlib import Path
import sys

START = "    <!--\n\n    WARNING: The MessageServlet"
END = "    <servlet>\n        <servlet-name>jolokia-agent</servlet-name>"

REPLACEMENT = """    <servlet>
        <servlet-name>MessageServlet</servlet-name>
        <servlet-class>org.apache.activemq.web.MessageServlet</servlet-class>
        <load-on-startup>1</load-on-startup>
        <async-supported>true</async-supported>
    </servlet>

    <servlet-mapping>
        <servlet-name>MessageServlet</servlet-name>
        <url-pattern>/message/*</url-pattern>
    </servlet-mapping>

"""


def main() -> None:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "/opt/activemq/webapps/api/WEB-INF/web.xml")
    xml = path.read_text()

    start = xml.find(START)
    if start == -1:
        # Already patched (or a future ActiveMQ enables it by default).
        return

    end = xml.find(END, start)
    if end == -1:
        raise SystemExit("Could not find the jolokia-agent servlet after the MessageServlet comment")

    path.write_text(xml[:start] + REPLACEMENT + xml[end:])


if __name__ == "__main__":
    main()
