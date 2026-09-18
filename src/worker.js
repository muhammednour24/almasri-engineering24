import { connect } from './db.js';
import { handleApi } from './api.js';
import { headers } from './security.js';

export default {
  async fetch(request, env) {
    let connection, response;

    try {
      if (new URL(request.url).pathname.startsWith('/api/')) {
        if (!env.MONGODB_URI) {
          return Response.json(
            {
              error: 'أضف إعدادات MongoDB أولًا. راجع دليل التشغيل المرفق.',
              code: 'NOT_CONFIGURED'
            },
            { status: 503, headers }
          );
        }

        connection = await connect(env);
        response = await handleApi(request, env, connection.db);
      } else {
        response = await env.ASSETS.fetch(request);
      }
    } catch (e) {
      const status = e.status || (e.code === 11000 ? 409 : 503);

      const message = e.status
        ? e.message
        : e.code === 11000
          ? 'رقم الموظف مستخدم مسبقًا أو تمت التهيئة بالفعل'
          : 'تعذر الاتصال أو حفظ البيانات. حاول مجددًا وتحقق من إعدادات قاعدة البيانات.';

      // تشخيص محدد دون طباعة رسالة الخطأ الأصلية أو أي أسرار.
      if (e.name === 'NotSupportedError') {
        const detail = String(e.message || '');

        if (/pbkdf2/i.test(detail)) {
          if (/iteration/i.test(detail)) {
            console.error('PASSWORD_HASH_ITERATION_LIMIT');
          } else {
            console.error('PASSWORD_HASH_NOT_SUPPORTED');
          }
        } else {
          console.error('UNSUPPORTED_OPERATION');
        }
      }

      // نسجل نوع الخطأ ورقمه فقط.
      if (!e.status && e.code !== 11000) {
        console.error(
          'API failure',
          e.name || 'Error',
          'code:',
          typeof e.code === 'number' ? e.code : 'UNKNOWN'
        );
      }

      response = Response.json({ error: message }, { status });
    } finally {
      if (connection) {
        await connection.close().catch(() => {});
      }
    }

    const result = new Response(response.body, response);

    for (const [key, value] of Object.entries(headers)) {
      result.headers.set(key, value);
    }

    return result;
  }
};