package app.dsh.mobile.engine

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.io.FileReader
import java.security.MessageDigest

/**
 * Translation cache for plugin descriptions.
 * 
 * Stores translations in a JSON file in the app's cache directory.
 * Key format: "pkgName|sha256(originalText)" -> translated text
 * This allows detecting when the original text changes and re-translating.
 */
object TranslationCache {
    private const val TAG = "TranslationCache"
    private const val CACHE_FILE_NAME = "plugin_translations.json"

    /**
     * Get the cache file for the given context.
     */
    private fun getCacheFile(context: Context): File {
        return File(context.cacheDir, CACHE_FILE_NAME)
    }

    /**
     * Generate a cache key from package name and original text.
     * Uses SHA-256 hash of the original text to detect changes.
     */
    private fun makeKey(pkg: String, originalText: String): String {
        val hash = MessageDigest.getInstance("SHA-256")
            .digest(originalText.toByteArray())
            .joinToString("") { "%02x".format(it) }
        return "$pkg|$hash"
    }

    /**
     * Load the entire cache from disk.
     */
    @Suppress("UNUSED_PARAMETER")
    private fun loadCache(context: Context): JSONObject {
        val file = getCacheFile(context)
        if (!file.exists()) return JSONObject()
        return try {
            FileReader(file).use { reader ->
                JSONObject(reader.readText())
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to load translation cache: ${e.message}")
            JSONObject()
        }
    }

    /**
     * Save the entire cache to disk.
     */
    private fun saveCache(context: Context, cache: JSONObject) {
        val file = getCacheFile(context)
        try {
            FileOutputStream(file).use { out ->
                out.write(cache.toString(2).toByteArray())
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to save translation cache: ${e.message}")
        }
    }

    /**
     * Get a cached translation if available and matches the original text.
     * Returns null if not cached or original text changed.
     */
    fun get(context: Context, pkg: String, originalText: String): String? {
        val cache = loadCache(context)
        val key = makeKey(pkg, originalText)
        return if (cache.has(key)) {
            cache.getString(key)
        } else {
            null
        }
    }

    /**
     * Store a translation in the cache.
     */
    fun put(context: Context, pkg: String, originalText: String, translatedText: String) {
        val cache = loadCache(context)
        val key = makeKey(pkg, originalText)
        cache.put(key, translatedText)
        saveCache(context, cache)
    }

    /**
     * Clear all cached translations (for debugging or privacy).
     */
    fun clear(context: Context) {
        val file = getCacheFile(context)
        if (file.exists()) file.delete()
    }
}