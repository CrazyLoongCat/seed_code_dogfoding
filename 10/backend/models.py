from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Text

db = SQLAlchemy()

class Packet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    time = db.Column(db.DateTime, default=datetime.utcnow)
    url = db.Column(db.String(2048), nullable=False)
    method = db.Column(db.String(32), nullable=False)
    status_code = db.Column(db.Integer)
    host = db.Column(db.String(512))
    path = db.Column(db.String(1024))
    protocol = db.Column(db.String(32))
    request_headers = db.Column(Text)
    request_body = db.Column(Text)
    response_headers = db.Column(Text)
    response_body = db.Column(Text)
    content_type = db.Column(db.String(256))
    content_length = db.Column(db.Integer)
    tags = db.Column(db.String(1024))
    has_sensitive = db.Column(db.Boolean, default=False)
    raw_request = db.Column(Text)
    raw_response = db.Column(Text)
    source_file = db.Column(db.String(512))
    is_starred = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'time': self.time.isoformat() if self.time else None,
            'url': self.url,
            'method': self.method,
            'status_code': self.status_code,
            'host': self.host,
            'path': self.path,
            'protocol': self.protocol,
            'request_headers': self.request_headers,
            'request_body': self.request_body,
            'response_headers': self.response_headers,
            'response_body': self.response_body,
            'content_type': self.content_type,
            'content_length': self.content_length,
            'tags': self.tags,
            'has_sensitive': self.has_sensitive,
            'source_file': self.source_file,
            'is_starred': self.is_starred,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Config(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(128), unique=True, nullable=False)
    value = db.Column(db.String(2048))
    description = db.Column(db.String(512))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'key': self.key,
            'value': self.value,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
