package com.androidircx

import android.app.Application
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.ReactPackage
import com.google.firebase.FirebaseApp

class MainApplication : Application(), ReactApplication {

    companion object {
        private const val TAG = "MainApplication"
    }

  // Temporary ReactNativeHost for PackageList initialization
  private val tempReactNativeHost = object : ReactNativeHost(this) {
    override fun getPackages(): List<ReactPackage> = emptyList()
    override fun getJSMainModuleName(): String = "index"
    override fun getUseDeveloperSupport(): Boolean = false
  }

  override val reactHost: ReactHost by lazy {
      try {
          Log.d(TAG, "Initializing ReactHost...")

          // Pre-check: Verify critical classes are available before proceeding
          try {
              Class.forName("com.facebook.react.PackageList")
              Class.forName("com.facebook.react.defaults.DefaultReactHost")
              Log.d(TAG, "Critical React Native classes verified")
          } catch (e: ClassNotFoundException) {
              Log.e(TAG, "CRITICAL: Required React Native class not found: ${e.message}", e)
              // Report to Crashlytics if available
              try {
                  com.google.firebase.crashlytics.FirebaseCrashlytics.getInstance()
                      .recordException(e)
              } catch (ignored: Exception) {
                  // Crashlytics not available, continue
              }
              throw RuntimeException("React Native classes not available", e)
          }

      val packages: MutableList<ReactPackage> = try {
          Log.d(TAG, "Loading packages from PackageList...")
          // Try to get packages using PackageList with temporary ReactNativeHost
          val packageList = PackageList(tempReactNativeHost)
          val loadedPackages = packageList.getPackages().toMutableList()
          Log.d(TAG, "Successfully loaded ${loadedPackages.size} packages from PackageList")
          loadedPackages
      } catch (e: NoClassDefFoundError) {
          Log.e(TAG, "CRITICAL: NoClassDefFoundError loading PackageList: ${e.message}", e)
          // Report to Crashlytics
          try {
              com.google.firebase.crashlytics.FirebaseCrashlytics.getInstance().recordException(e)
          } catch (ignored: Exception) {
              // Crashlytics not available
          }
          // Fallback: return empty list - autolinking via Gradle should handle packages
          Log.w(TAG, "Falling back to empty package list - autolinking should handle packages")
          mutableListOf()
      } catch (e: Exception) {
          Log.e(TAG, "Failed to get packages from PackageList: ${e.message}", e)
          // Report to Crashlytics
          try {
              com.google.firebase.crashlytics.FirebaseCrashlytics.getInstance().recordException(e)
          } catch (ignored: Exception) {
              // Crashlytics not available
          }
          // Fallback: return empty list - autolinking via Gradle should handle packages
          mutableListOf()
      }

      // Add our custom package for IRC foreground service
          try {
              packages.add(IRCForegroundServicePackage())
              Log.d(TAG, "Added IRCForegroundServicePackage")
          } catch (e: Exception) {
              Log.e(TAG, "Failed to add IRCForegroundServicePackage: ${e.message}", e)
              // Don't fail completely if custom package fails
          }

          Log.d(TAG, "Creating ReactHost with ${packages.size} packages...")
          val host = getDefaultReactHost(
              context = applicationContext,
              packageList = packages,
          )
          Log.d(TAG, "ReactHost created successfully")
          host
      } catch (e: Exception) {
          Log.e(TAG, "CRITICAL: Failed to initialize ReactHost: ${e.message}", e)
          // Report to Crashlytics
          try {
              com.google.firebase.crashlytics.FirebaseCrashlytics.getInstance().recordException(e)
          } catch (ignored: Exception) {
              // Crashlytics not available
          }
          // Re-throw to prevent app from starting in broken state
          throw RuntimeException("Failed to initialize React Native", e)
      }
  }

  override fun onCreate() {
    super.onCreate()
      Log.d(TAG, "Application onCreate started")

      try {
          // Initialize Firebase first (before React Native)
          Log.d(TAG, "Initializing Firebase...")
          FirebaseApp.initializeApp(this)
          Log.d(TAG, "Firebase initialized successfully")
      } catch (e: Exception) {
          Log.e(TAG, "Failed to initialize Firebase: ${e.message}", e)
          // Don't fail completely - Firebase is optional for basic functionality
          try {
              com.google.firebase.crashlytics.FirebaseCrashlytics.getInstance().recordException(e)
          } catch (ignored: Exception) {
              // Crashlytics not available
          }
      }

      try {
          // Initialize React Native
          Log.d(TAG, "Loading React Native...")
          loadReactNative(this)
          Log.d(TAG, "React Native loaded successfully")
      } catch (e: Exception) {
          Log.e(TAG, "CRITICAL: Failed to load React Native: ${e.message}", e)
          // Report to Crashlytics
          try {
              com.google.firebase.crashlytics.FirebaseCrashlytics.getInstance().recordException(e)
          } catch (ignored: Exception) {
              // Crashlytics not available
          }
          // Re-throw - app cannot function without React Native
          throw RuntimeException("Failed to load React Native", e)
      }

      Log.d(TAG, "Application onCreate completed")
  }
}
