"""
ComfyUI-Node-Layout-Guard
إضافة خفيفة ومستقلة لحماية ومزامنة أبعاد العقد وعناصر الواجهة (Widgets, DOM elements, Images)
متوافقة مع كافة إصدارات ComfyUI الحديثة (0.31+ فما فوق) والنسخ السابقة.
"""

import os

# تسجيل مسار مجلد ملفات الـ JavaScript للواجهة
WEB_DIRECTORY = "./js"

# الإضافة لا تحتاج إلى عقد بايثون خلفية، دورها مخصص بنسبة 100% للواجهة الرسومية
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
