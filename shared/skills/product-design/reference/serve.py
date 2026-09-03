#!/usr/bin/env python3
"""serve.py — static server WITH HTTP Range support, for the annotator.

`python3 -m http.server` does not implement Range: it answers every request with
a whole-file 200. Chrome's media stack will not start a video without 206
partial-content support, so annotate.html loads its table, resolves the right
URL, fires no error — and simply never reaches `loadedmetadata`. A silent hang
with nothing in the console, which is exactly the kind of failure that costs an
hour. Use this instead.

    python3 serve.py            # serves reference/ on 8731
"""
import http.server, os, re, socketserver, sys

class RangeHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        rng = self.headers.get('Range')
        if not rng:
            return super().send_head()
        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            return super().send_head()

        size = os.path.getsize(path)
        m = re.match(r'bytes=(\d*)-(\d*)', rng.strip())
        if not m:
            self.send_error(400, 'malformed Range')
            return None
        start_s, end_s = m.groups()
        if start_s == '':                      # suffix form: bytes=-N
            length = int(end_s)
            start = max(0, size - length)
            end = size - 1
        else:
            start = int(start_s)
            end = int(end_s) if end_s else size - 1
        if start >= size:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.end_headers()
            return None
        end = min(end, size - 1)

        f = open(path, 'rb')
        f.seek(start)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        self._remaining = end - start + 1
        return f

    def copyfile(self, source, outputfile):
        remaining = getattr(self, '_remaining', None)
        if remaining is None:
            return super().copyfile(source, outputfile)
        while remaining > 0:
            chunk = source.read(min(64 * 1024, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)

    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()

    def log_message(self, *a):
        pass

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8731
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('127.0.0.1', port), RangeHandler) as s:
        print(f'serving {os.getcwd()} on http://127.0.0.1:{port}  (Range supported)')
        s.serve_forever()
