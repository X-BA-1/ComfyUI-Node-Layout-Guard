import { app } from "../../scripts/app.js";

/**
 * ComfyUI-Node-Layout-Guard
 * =========================================================================
 * إضافة ذكية وشاملة لمزامنة وحماية أبعاد العقد وعناصر الواجهة التفاعلية (DOM Widgets, Inputs, Images).
 * متوافقة مع إصدارات ComfyUI الحديثة (0.31+ فما فوق) والنسخ السابقة.
 * تعمل بنمط غير تدميري (Non-Destructive Chaining) للحفاظ التام على وظائف العقد الأخرى.
 * =========================================================================
 */

// علامة لتمييز العقد التي تمت معالجتها برمجياً لمنع التكرار
const GUARD_PATCHED_KEY = "__node_layout_guard_active__";

/**
 * دالة مزامنة وتحديث أبعاد كافة عناصر الـ Widgets وعناصر الـ DOM داخل العقدة
 * @param {object} node كائن العقدة في LiteGraph
 */
function syncNodeWidgets(node) {
    if (!node || !node.size) return;

    // احتساب العرض الداخلي الصافي للعقدة بعد خصم الهوامش
    const nodeWidth = Number(node.size[0]) || 200;
    const margin = 20;
    const innerWidth = Math.max(80, nodeWidth - margin);

    // 1. مزامنة عناصر الـ Widgets
    if (Array.isArray(node.widgets)) {
        for (const widget of node.widgets) {
            if (!widget) continue;

            // تحديث خاصية العرض الداخلية للـ Widget إن وجدت
            if (typeof widget.width === "number") {
                widget.width = innerWidth;
            }

            // مزامنة عناصر الـ HTML DOM (مشغلات الصوت، مشغلات الفيديو، حقول النصوص، الكانفاس المخصص)
            const domElements = [widget.element, widget.inputEl].filter(Boolean);
            for (const el of domElements) {
                try {
                    el.style.boxSizing = "border-box";
                    el.style.width = `${innerWidth}px`;
                    el.style.maxWidth = `${innerWidth}px`;

                    // إذا كان العنصر مغلفاً بحاوية مخصصة من ComfyUI
                    if (el.parentElement && el.parentElement !== document.body && el.parentElement.classList?.contains("dom-widget")) {
                        el.parentElement.style.width = `${innerWidth}px`;
                        el.parentElement.style.maxWidth = `${innerWidth}px`;
                    }
                } catch (e) {
                    // تجاهل الأخطاء غير الحرجة لعناصر DOM المنفصلة
                }
            }

            // استدعاء دالة التحجيم المخصصة للـ Widget إن كان المطور قد عرّفها
            if (typeof widget.onResize === "function") {
                try {
                    widget.onResize(node.size[0], node.size[1]);
                } catch (e) {
                    // حماية المحرك من أي استثناء داخل كود المطور
                }
            }
        }
    }
}

/**
 * تطبيق الربط الآمن المتسلسل على العقدة الفردية
 * @param {object} node كائن العقدة
 */
function patchNodeInstance(node) {
    if (!node || node[GUARD_PATCHED_KEY]) return;
    node[GUARD_PATCHED_KEY] = true;

    // 1. ربط وتأمين حدث التحجيم (onResize)
    const origOnResize = node.onResize;
    node.onResize = function (size) {
        let result;
        if (origOnResize) {
            try {
                result = origOnResize.apply(this, arguments);
            } catch (err) {
                console.warn("[NodeLayoutGuard] Protected original onResize error:", err);
            }
        }

        // تطبيق مزامنة الأبعاد لعناصر الإدخال والـ DOM فوراً أثناء السحب
        syncNodeWidgets(this);
        return result;
    };

    // 2. ربط وتأمين حدث تغيير التوصيلات والمقابس (onConnectionsChange)
    const origOnConnectionsChange = node.onConnectionsChange;
    node.onConnectionsChange = function () {
        let result;
        if (origOnConnectionsChange) {
            try {
                result = origOnConnectionsChange.apply(this, arguments);
            } catch (err) {
                console.warn("[NodeLayoutGuard] Protected original onConnectionsChange error:", err);
            }
        }

        // مزامنة عناصر الإدخال بعد انتهاء معالجة الربط دون فرض أي ارتفاع عمودي إجباري
        setTimeout(() => {
            syncNodeWidgets(this);
        }, 15);

        return result;
    };

    // 3. ربط وتأمين استعادة الإعدادات عند فتح ملفات العمل (onConfigure)
    const origOnConfigure = node.onConfigure;
    node.onConfigure = function () {
        let result;
        if (origOnConfigure) {
            try {
                result = origOnConfigure.apply(this, arguments);
            } catch (err) {
                console.warn("[NodeLayoutGuard] Protected original onConfigure error:", err);
            }
        }

        // مزامنة الأبعاد بعد اكتمال تهيئة العقدة من الـ Workflow مع احترام حجمها المحفوظ
        setTimeout(() => {
            syncNodeWidgets(this);
        }, 20);

        return result;
    };

    // مزامنة فورية أولية عند إنشاء العقدة
    syncNodeWidgets(node);
}

/**
 * تسجيل الإضافة لدى واجهة ComfyUI الرسمية
 */
app.registerExtension({
    name: "Comfy.NodeLayoutGuard",

    async setup(appInstance) {
        console.log("%c[NodeLayoutGuard] %cLoaded & Active (ComfyUI Node Layout Guard)", "color: #10b981; font-weight: bold;", "color: inherit;");

        // 1. حماية مستوى Prototype العام لمحرك LiteGraph كطبقة أمان شاملة
        if (typeof LGraphNode !== "undefined" && LGraphNode.prototype) {
            const protoOnResize = LGraphNode.prototype.onResize;
            LGraphNode.prototype.onResize = function (size) {
                const res = protoOnResize ? protoOnResize.apply(this, arguments) : undefined;
                syncNodeWidgets(this);
                return res;
            };
        }

        // 2. إضافة خيار الإصلاح السريع في قائمة الزر الأيمن لكافة العقد (Context Menu)
        const origGetNodeMenuOptions = LGraphCanvas.prototype.getNodeMenuOptions;
        LGraphCanvas.prototype.getNodeMenuOptions = function (node) {
            const options = origGetNodeMenuOptions ? origGetNodeMenuOptions.apply(this, arguments) : [];

            if (node && Array.isArray(options)) {
                options.push(null); // خط فاصل في القائمة
                options.push({
                    content: "📐 Auto-Fit & Fix Layout (إصلاح واحتواء الأبعاد)",
                    callback: () => {
                        if (typeof node.computeSize === "function") {
                            const idealSize = node.computeSize();
                            if (idealSize && Array.isArray(idealSize)) {
                                node.setSize([
                                    Math.max(node.size[0], idealSize[0]),
                                    Math.max(node.size[1], idealSize[1])
                                ]);
                            }
                        }
                        syncNodeWidgets(node);
                        node.setDirtyCanvas(true, true);
                    }
                });
            }

            return options;
        };

        // 3. فحص وتأمين كافة العقد الموجودة مسبقاً على لوحة الرسم
        if (appInstance.graph && typeof appInstance.graph._nodes !== "undefined") {
            const existingNodes = appInstance.graph._nodes || [];
            for (const node of existingNodes) {
                patchNodeInstance(node);
            }
        }
    },

    // يتم استدعاؤها عند إنشاء أي عقدة جديدة على لوحة الرسم
    async nodeCreated(node) {
        patchNodeInstance(node);
    },

    // يتم استدعاؤها عند تحميل عقدة من مسار عمل محفوظ
    async loadedGraphNode(node) {
        patchNodeInstance(node);
        setTimeout(() => {
            syncNodeWidgets(node);
        }, 50);
    }
});
