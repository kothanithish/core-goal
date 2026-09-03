import http.server
import sys
import os

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print("Serving Pong game at http://localhost:3000")
    sys.argv = ['server.py', '3000']
    http.server.test(HandlerClass=http.server.SimpleHTTPRequestHandler, port=3000)
