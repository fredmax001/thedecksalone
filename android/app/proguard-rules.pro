# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Preserve line number information for debugging stack traces.
-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ============================================================================
# Deck Salone — Capacitor / Cordova keep rules
# ============================================================================
# Keep all Capacitor core classes
-keep public class com.getcapacitor.** { *; }
-keepclassmembers public class com.getcapacitor.** { *; }

# Keep Capacitor Android classes
-keep public class com.getcapacitor.android.** { *; }
-keepclassmembers public class com.getcapacitor.android.** { *; }

# Keep Bridge and BridgeActivity
-keep public class com.getcapacitor.Bridge { *; }
-keepclassmembers public class com.getcapacitor.Bridge { *; }
-keep public class com.getcapacitor.BridgeActivity { *; }
-keepclassmembers public class com.getcapacitor.BridgeActivity { *; }

# Keep all Capacitor Plugins and their members
-keep public class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers public class * extends com.getcapacitor.Plugin { *; }

# Keep Capacitor plugin result / call / config classes
-keep public class com.getcapacitor.plugin.util.** { *; }
-keepclassmembers public class com.getcapacitor.plugin.util.** { *; }

# Keep cordova compatibility shim
-keep public class com.getcapacitor.cordova.** { *; }
-keepclassmembers public class com.getcapacitor.cordova.** { *; }

# Keep plugin packages used by this app
-keep public class com.capacitorjs.plugins.app.** { *; }
-keep public class com.capacitorjs.plugins.browser.** { *; }
-keep public class com.capacitorjs.plugins.localnotifications.** { *; }
-keep public class com.capacitorjs.plugins.splashscreen.** { *; }

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep JavascriptInterface for WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep the main application class
-keep public class decksalone.com.MainActivity { *; }
-keepclassmembers public class decksalone.com.MainActivity { *; }
