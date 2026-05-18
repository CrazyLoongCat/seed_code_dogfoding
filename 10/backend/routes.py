from flask import Blueprint, request, jsonify, send_file, make_response
from models import db, Packet, Config
from parser import BurpParser
import io
import json
import xml.etree.ElementTree as ET
from xml.dom import minidom
from datetime import datetime

api_bp = Blueprint('api', __name__)

@api_bp.route('/packets', methods=['GET'])
def get_packets():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')
    method = request.args.get('method', '')
    status_code = request.args.get('status_code', '')
    has_sensitive = request.args.get('has_sensitive', '')
    is_starred = request.args.get('is_starred', '')
    sort_by = request.args.get('sort_by', 'time')
    sort_order = request.args.get('sort_order', 'desc')

    query = Packet.query

    if search:
        query = query.filter(
            (Packet.url.contains(search)) |
            (Packet.host.contains(search)) |
            (Packet.path.contains(search)) |
            (Packet.request_body.contains(search)) |
            (Packet.response_body.contains(search)) |
            (Packet.request_headers.contains(search)) |
            (Packet.response_headers.contains(search))
        )

    if method:
        query = query.filter(Packet.method == method)

    if status_code:
        try:
            sc = int(status_code)
            if 100 <= sc < 200:
                query = query.filter(Packet.status_code.between(100, 199))
            elif 200 <= sc < 300:
                query = query.filter(Packet.status_code.between(200, 299))
            elif 300 <= sc < 400:
                query = query.filter(Packet.status_code.between(300, 399))
            elif 400 <= sc < 500:
                query = query.filter(Packet.status_code.between(400, 499))
            elif sc >= 500:
                query = query.filter(Packet.status_code >= 500)
            else:
                query = query.filter(Packet.status_code == sc)
        except:
            pass

    if has_sensitive == 'true':
        query = query.filter(Packet.has_sensitive == True)
    elif has_sensitive == 'false':
        query = query.filter(Packet.has_sensitive == False)

    if is_starred == 'true':
        query = query.filter(Packet.is_starred == True)
    elif is_starred == 'false':
        query = query.filter(Packet.is_starred == False)

    if sort_by == 'time':
        order_column = Packet.time
    elif sort_by == 'status_code':
        order_column = Packet.status_code
    elif sort_by == 'method':
        order_column = Packet.method
    else:
        order_column = Packet.created_at

    if sort_order == 'desc':
        query = query.order_by(order_column.desc())
    else:
        query = query.order_by(order_column.asc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'items': [p.to_dict() for p in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'page': page,
        'per_page': per_page
    })

@api_bp.route('/packets/<int:packet_id>', methods=['GET'])
def get_packet(packet_id):
    packet = Packet.query.get_or_404(packet_id)
    return jsonify(packet.to_dict())

@api_bp.route('/packets/<int:packet_id>', methods=['DELETE'])
def delete_packet(packet_id):
    packet = Packet.query.get_or_404(packet_id)
    db.session.delete(packet)
    db.session.commit()
    return jsonify({'message': 'Packet deleted successfully'})

@api_bp.route('/packets', methods=['DELETE'])
def delete_packets():
    data = request.get_json() or {}
    ids = data.get('ids', [])
    if ids:
        Packet.query.filter(Packet.id.in_(ids)).delete(synchronize_session=False)
        db.session.commit()
        return jsonify({'message': f'{len(ids)} packets deleted successfully'})
    else:
        Packet.query.delete()
        db.session.commit()
        return jsonify({'message': 'All packets deleted successfully'})

@api_bp.route('/import', methods=['POST'])
def import_packets():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        content = file.read().decode('utf-8', errors='replace')
        filename = file.filename

        packets_data = BurpParser.parse(content, filename)

        if not packets_data:
            return jsonify({'error': 'No valid packets found in file'}), 400

        config = get_config_dict()
        sensitive_keywords = config.get('sensitive_keywords', '')
        auto_tagging = config.get('auto_tagging', 'true') == 'true'

        saved_count = 0
        for data in packets_data:
            if not data.get('url') and not data.get('method'):
                continue

            has_sensitive, found_tags = BurpParser.check_sensitive(data, sensitive_keywords)

            tags = []
            if auto_tagging:
                if has_sensitive:
                    tags.extend(found_tags)
                if data.get('status_code'):
                        tags.append(f"status:{data['status_code']}")
                if data.get('method'):
                        tags.append(f"method:{data['method'].lower()}")
                if data.get('content_type'):
                    if 'json' in data['content_type'].lower():
                        tags.append('json')
                    elif 'html' in data['content_type'].lower():
                        tags.append('html')
                    elif 'image' in data['content_type'].lower():
                        tags.append('image')

            packet = Packet(
                time=data.get('time'),
                url=data.get('url'),
                method=data.get('method'),
                status_code=data.get('status_code'),
                host=data.get('host'),
                path=data.get('path'),
                protocol=data.get('protocol'),
                request_headers=data.get('request_headers'),
                request_body=data.get('request_body'),
                response_headers=data.get('response_headers'),
                response_body=data.get('response_body'),
                content_type=data.get('content_type'),
                content_length=data.get('content_length'),
                tags=','.join(tags) if tags else None,
                has_sensitive=has_sensitive,
                raw_request=data.get('raw_request'),
                raw_response=data.get('raw_response'),
                source_file=data.get('source_file')
            )
            db.session.add(packet)
            saved_count += 1

        db.session.commit()

        return jsonify({
            'message': f'Successfully imported {saved_count} packets',
            'count': saved_count
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/config', methods=['GET'])
def get_config():
    configs = Config.query.all()
    return jsonify([c.to_dict() for c in configs])

@api_bp.route('/config', methods=['PUT'])
def update_config():
    data = request.get_json() or {}
    updated_count = 0
    for key, value in data.items():
        config = Config.query.filter_by(key=key).first()
        if config:
            config.value = str(value)
            updated_count += 1
    db.session.commit()
    return jsonify({'message': f'Updated {updated_count} config items'})

@api_bp.route('/stats', methods=['GET'])
def get_stats():
    total = Packet.query.count()
    methods = db.session.query(
        Packet.method,
        db.func.count(Packet.method)
    ).group_by(Packet.method).all()
    status_codes = db.session.query(
        Packet.status_code,
        db.func.count(Packet.status_code)
    ).filter(Packet.status_code.isnot(None)).group_by(Packet.status_code).all()
    sensitive_count = Packet.query.filter_by(has_sensitive=True).count()
    hosts = db.session.query(
        Packet.host,
        db.func.count(Packet.host)
    ).filter(Packet.host.isnot(None)).group_by(Packet.host).order_by(db.func.count(Packet.host).desc()).limit(10).all()

    return jsonify({
        'total': total,
        'methods': {m: c for m, c in methods},
        'status_codes': {str(s): c for s, c in status_codes},
        'sensitive_count': sensitive_count,
        'hosts': {h: c for h, c in hosts}
    })

@api_bp.route('/packets/<int:packet_id>/tags', methods=['PUT'])
def update_packet_tags(packet_id):
    packet = Packet.query.get_or_404(packet_id)
    data = request.get_json() or {}
    tags = data.get('tags', '')
    packet.tags = tags
    db.session.commit()
    return jsonify({'message': 'Tags updated successfully'})

def get_config_dict():
    configs = Config.query.all()
    return {c.key: c.value for c in configs}

@api_bp.route('/packets/export', methods=['GET'])
def export_packets():
    ids = request.args.get('ids', '')
    format_type = request.args.get('format', 'json')

    if ids:
        id_list = [int(i) for i in ids.split(',') if i.isdigit()]
        packets = Packet.query.filter(Packet.id.in_(id_list)).all()
    else:
        packets = Packet.query.all()

    if not packets:
        return jsonify({'error': 'No packets found to export'}), 404

    if format_type == 'xml':
        return export_to_xml(packets)
    else:
        return export_to_json(packets)

def export_to_json(packets):
    data = [p.to_dict() for p in packets]
    output = json.dumps({'packets': data}, indent=2, ensure_ascii=False)

    buffer = io.BytesIO(output.encode('utf-8'))
    filename = f"packets_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

    return send_file(
        buffer,
        mimetype='application/json',
        as_attachment=True,
        download_name=filename
    )

def export_to_xml(packets):
    root = ET.Element('items')

    for packet in packets:
        item = ET.SubElement(root, 'item')

        if packet.time:
            time_elem = ET.SubElement(item, 'time')
            time_elem.text = packet.time.strftime('%a, %d %b %Y %H:%M:%S GMT')

        url_elem = ET.SubElement(item, 'url')
        url_elem.text = packet.url

        method_elem = ET.SubElement(item, 'method')
        method_elem.text = packet.method

        if packet.status_code:
            status_elem = ET.SubElement(item, 'status')
            status_elem.text = str(packet.status_code)

        if packet.host:
            host_elem = ET.SubElement(item, 'host')
            host_elem.text = packet.host

        if packet.path:
            path_elem = ET.SubElement(item, 'path')
            path_elem.text = packet.path

        if packet.protocol:
            protocol_elem = ET.SubElement(item, 'protocol')
            protocol_elem.text = packet.protocol

        if packet.request_headers:
            req_headers = ET.SubElement(item, 'request')
            req_headers.text = packet.request_headers

        if packet.request_body:
            req_body = ET.SubElement(item, 'requestbody')
            req_body.text = packet.request_body

        if packet.response_headers:
            resp_headers = ET.SubElement(item, 'response')
            resp_headers.text = packet.response_headers

        if packet.response_body:
            resp_body = ET.SubElement(item, 'responsebody')
            resp_body.text = packet.response_body

        if packet.content_type:
            ctype_elem = ET.SubElement(item, 'contenttype')
            ctype_elem.text = packet.content_type

        if packet.content_length:
            clength_elem = ET.SubElement(item, 'contentlength')
            clength_elem.text = str(packet.content_length)

    rough_string = ET.tostring(root, 'utf-8')
    reparsed = minidom.parseString(rough_string)
    pretty_xml = reparsed.toprettyxml(indent='  ')

    buffer = io.BytesIO(pretty_xml.encode('utf-8'))
    filename = f"packets_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xml"

    return send_file(
        buffer,
        mimetype='application/xml',
        as_attachment=True,
        download_name=filename
    )

@api_bp.route('/packets/<int:packet_id>/star', methods=['PUT'])
def toggle_star(packet_id):
    packet = Packet.query.get_or_404(packet_id)
    packet.is_starred = not packet.is_starred
    db.session.commit()
    return jsonify({'message': 'Star status updated', 'is_starred': packet.is_starred})

@api_bp.route('/packets/replay', methods=['POST'])
def replay_request():
    import urllib.request
    import ssl

    data = request.get_json() or {}
    packet_id = data.get('id')

    if not packet_id:
        return jsonify({'error': 'Packet ID is required'}), 400

    packet = Packet.query.get_or_404(packet_id)

    try:
        url = packet.url
        method = packet.method or 'GET'
        headers = {}

        if packet.request_headers:
            for line in packet.request_headers.split('\n'):
                if ':' in line:
                    key, value = line.split(':', 1)
                    headers[key.strip()] = value.strip()

        body = packet.request_body or None

        if body and isinstance(body, str):
            body = body.encode('utf-8')

        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        req = urllib.request.Request(url, data=body, method=method, headers=headers)

        with urllib.request.urlopen(req, timeout=30, context=ctx) as response:
            resp_body = response.read().decode('utf-8', errors='replace')
            resp_headers = '\n'.join([f"{k}: {v}" for k, v in response.headers.items()])

            return jsonify({
                'status_code': response.status,
                'headers': resp_headers,
                'body': resp_body,
                'url': url,
                'method': method
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
