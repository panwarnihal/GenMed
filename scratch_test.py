import urllib.request
import urllib.error

url = 'http://localhost:8000/api/v1/scanner/upload'
headers = {
    'Origin': 'http://localhost:5173',
    'Content-Type': 'multipart/form-data; boundary=boundary123'
}
data = b'--boundary123\r\nContent-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\nfakeimagecontent\r\n--boundary123--\r\n'

req = urllib.request.Request(url, data=data, headers=headers, method='POST')
try:
    with urllib.request.urlopen(req) as response:
        print('Status:', response.status)
        print('Headers:', response.headers)
        print('Body:', response.read())
except urllib.error.HTTPError as e:
    print('HTTPError:', e.code)
    print('Headers:', e.headers)
    print('Body:', e.read())
except Exception as e:
    print('Exception:', e)
