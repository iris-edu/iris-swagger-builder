import SimpleHTTPServer
import SocketServer
import sys

"""
Basic web server
"""

try:
    PORT = int(sys.argv[1])
except:
    PORT = 8000
print "serving at port", PORT

Handler = SimpleHTTPServer.SimpleHTTPRequestHandler

httpd = SocketServer.TCPServer(("", PORT), Handler)

httpd.serve_forever()
