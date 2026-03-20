from flask import jsonify

def success(data=None, message="ok", code=0, http_status=200):
    return jsonify({
        "code": code,
        "message": message,
        "data": data if data is not None else {}
    }), http_status

def fail(message="error", code=1, http_status=400, data=None):
    return jsonify({
        "code": code,
        "message": message,
        "data": data if data is not None else {}
    }), http_status
