from flask import jsonify

def success(data=None, msg="操作成功"):
    return jsonify({"code":200, "msg":msg, "data":data or {}})

def fail(code=400, msg="操作失败", data=None):
    return jsonify({"code":code, "msg":msg, "data":data or {}})