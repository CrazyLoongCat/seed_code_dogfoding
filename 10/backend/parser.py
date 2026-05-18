import json
import base64
import xml.etree.ElementTree as ET
from datetime import datetime
from dateutil import parser as date_parser

class BurpParser:
    @staticmethod
    def parse(content, filename=None):
        content = content.lstrip()
        if content.startswith('<'):
            return BurpParser.parse_xml(content, filename)
        elif content.startswith('{') or content.startswith('['):
            return BurpParser.parse_json(content, filename)
        else:
            return BurpParser.parse_raw(content, filename)

    @staticmethod
    def parse_xml(xml_content, filename=None):
        packets = []
        root = ET.fromstring(xml_content.encode('utf-8'))

        items = root.findall('.//item')
        for item in items:
            packet = BurpParser._parse_item_xml(item, filename)
            if packet:
                packets.append(packet)

        return packets

    @staticmethod
    def _parse_item_xml(item, filename=None):
        try:
            time_str = BurpParser._get_element_text(item, 'time')
            url = BurpParser._get_element_text(item, 'url')
            method = BurpParser._get_element_text(item, 'method')
            status_code = BurpParser._get_element_text(item, 'status')
            request_b64 = BurpParser._get_element_text(item, 'request')
            response_b64 = BurpParser._get_element_text(item, 'response')
            protocol = BurpParser._get_element_text(item, 'protocol')
            host = BurpParser._get_element_text(item, 'host')
            port = BurpParser._get_element_text(item, 'port')
            path = BurpParser._get_element_text(item, 'path')

            time = None
            if time_str:
                try:
                    time = date_parser.parse(time_str)
                except:
                    time = datetime.utcnow()

            request_raw = ''
            request_headers = ''
            request_body = ''
            if request_b64:
                try:
                    request_raw = base64.b64decode(request_b64).decode('utf-8', errors='replace')
                    request_headers, request_body = BurpParser._split_headers_body(request_raw)
                except:
                    pass

            response_raw = ''
            response_headers = ''
            response_body = ''
            content_type = ''
            content_length = 0
            if response_b64:
                try:
                    response_raw = base64.b64decode(response_b64).decode('utf-8', errors='replace')
                    response_headers, response_body = BurpParser._split_headers_body(response_raw)
                    content_type = BurpParser._extract_header(response_headers, 'Content-Type')
                    content_length = BurpParser._extract_content_length(response_headers, response_body)
                except:
                    pass

            status_code_int = None
            if status_code:
                try:
                    status_code_int = int(status_code)
                except:
                    pass

            return {
                'time': time,
                'url': url,
                'method': method,
                'status_code': status_code_int,
                'host': host,
                'path': path,
                'protocol': protocol,
                'request_headers': request_headers,
                'request_body': request_body,
                'response_headers': response_headers,
                'response_body': response_body,
                'content_type': content_type,
                'content_length': content_length,
                'raw_request': request_raw,
                'raw_response': response_raw,
                'source_file': filename
            }
        except Exception as e:
            print(f"Error parsing XML item: {e}")
            return None

    @staticmethod
    def parse_json(json_content, filename=None):
        packets = []
        try:
            data = json.loads(json_content)
            if isinstance(data, list):
                items = data
            elif isinstance(data, dict) and 'items' in data:
                items = data['items']
            else:
                items = [data]

            for item in items:
                packet = BurpParser._parse_item_json(item, filename)
                if packet:
                    packets.append(packet)
        except Exception as e:
            print(f"Error parsing JSON: {e}")

        return packets

    @staticmethod
    def _parse_item_json(item, filename=None):
        try:
            time_str = item.get('time') or item.get('timestamp')
            url = item.get('url')
            method = item.get('method')
            status_code = item.get('status') or item.get('status_code')
            request_raw = item.get('request') or item.get('raw_request')
            response_raw = item.get('response') or item.get('raw_response')
            host = item.get('host')
            path = item.get('path')
            protocol = item.get('protocol')

            time = None
            if time_str:
                try:
                    if isinstance(time_str, (int, float)):
                        time = datetime.fromtimestamp(time_str / 1000 if time_str > 10000000000 else time_str)
                    else:
                        time = date_parser.parse(str(time_str))
                except:
                    time = datetime.utcnow()

            request_headers = ''
            request_body = ''
            if request_raw:
                request_headers, request_body = BurpParser._split_headers_body(request_raw)

            response_headers = ''
            response_body = ''
            content_type = item.get('content_type', '')
            content_length = item.get('content_length', 0)
            if response_raw:
                response_headers, response_body = BurpParser._split_headers_body(response_raw)
                if not content_type:
                    content_type = BurpParser._extract_header(response_headers, 'Content-Type')
                if not content_length:
                    content_length = BurpParser._extract_content_length(response_headers, response_body)

            status_code_int = None
            if status_code:
                try:
                    status_code_int = int(status_code)
                except:
                    pass

            return {
                'time': time,
                'url': url,
                'method': method,
                'status_code': status_code_int,
                'host': host,
                'path': path,
                'protocol': protocol,
                'request_headers': request_headers,
                'request_body': request_body,
                'response_headers': response_headers,
                'response_body': response_body,
                'content_type': content_type,
                'content_length': content_length,
                'raw_request': request_raw,
                'raw_response': response_raw,
                'source_file': filename
            }
        except Exception as e:
            print(f"Error parsing JSON item: {e}")
            return None

    @staticmethod
    def parse_raw(raw_content, filename=None):
        packets = []
        parts = raw_content.split('\n\n\n')

        for part in parts:
            part = part.strip()
            if not part:
                continue

            if '\n\n' in part:
                request_part, response_part = part.split('\n\n', 1)
            else:
                request_part = part
                response_part = ''

            request_headers, request_body = BurpParser._split_headers_body(request_part)
            response_headers, response_body = BurpParser._split_headers_body(response_part)

            first_line = request_headers.split('\n')[0] if request_headers else ''
            method = ''
            path = ''
            protocol = ''
            if first_line:
                parts_line = first_line.split(' ')
                if len(parts_line) >= 1:
                    method = parts_line[0]
                if len(parts_line) >= 2:
                    path = parts_line[1]
                if len(parts_line) >= 3:
                    protocol = parts_line[2]

            host = BurpParser._extract_header(request_headers, 'Host')
            url = f"http://{host}{path}" if host and path else path

            status_code = None
            if response_headers:
                first_resp_line = response_headers.split('\n')[0]
                if first_resp_line:
                    resp_parts = first_resp_line.split(' ')
                    if len(resp_parts) >= 2:
                        try:
                            status_code = int(resp_parts[1])
                        except:
                            pass

            content_type = BurpParser._extract_header(response_headers, 'Content-Type')
            content_length = BurpParser._extract_content_length(response_headers, response_body)

            packet = {
                'time': datetime.utcnow(),
                'url': url,
                'method': method,
                'status_code': status_code,
                'host': host,
                'path': path,
                'protocol': protocol,
                'request_headers': request_headers,
                'request_body': request_body,
                'response_headers': response_headers,
                'response_body': response_body,
                'content_type': content_type,
                'content_length': content_length,
                'raw_request': request_part,
                'raw_response': response_part,
                'source_file': filename
            }
            packets.append(packet)

        return packets

    @staticmethod
    def _split_headers_body(content):
        if '\n\n' in content:
            headers, body = content.split('\n\n', 1)
        elif '\r\n\r\n' in content:
            headers, body = content.split('\r\n\r\n', 1)
        else:
            headers = content
            body = ''
        return headers.strip(), body.strip()

    @staticmethod
    def _get_element_text(parent, tag):
        elem = parent.find(tag)
        if elem is not None and elem.text:
            return elem.text.strip()
        return ''

    @staticmethod
    def _extract_header(headers, header_name):
        if not headers:
            return ''
        for line in headers.split('\n'):
            if ':' in line:
                name, value = line.split(':', 1)
                if name.strip().lower() == header_name.lower():
                    return value.strip()
        return ''

    @staticmethod
    def _extract_content_length(headers, body):
        length = BurpParser._extract_header(headers, 'Content-Length')
        if length:
            try:
                return int(length)
            except:
                pass
        return len(body) if body else 0

    @staticmethod
    def check_sensitive(data, keywords):
        if not keywords:
            return False, []

        keyword_list = [k.strip().lower() for k in keywords.split(',') if k.strip()]
        found = []

        text_to_check = ' '.join([
            str(data.get('request_headers', '') or ''),
            str(data.get('request_body', '') or ''),
            str(data.get('response_headers', '') or ''),
            str(data.get('response_body', '') or ''),
            str(data.get('url', '') or '')
        ]).lower()

        for kw in keyword_list:
            if kw in text_to_check:
                found.append(kw)

        return len(found) > 0, found
