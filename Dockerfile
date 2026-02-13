FROM reactnativecommunity/react-native-android:latest

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

RUN sed -i 's/\r$//' /app/scripts/docker/prepare-secrets.sh /app/android/gradlew \
  && chmod +x /app/scripts/docker/prepare-secrets.sh /app/android/gradlew

ENTRYPOINT ["/app/scripts/docker/prepare-secrets.sh"]
CMD ["./gradlew", "clean", ":app:externalNativeBuildCleanRelease", "assembleRelease", "bundleRelease", "-PreactNativeArchitectures=armeabi-v7a,arm64-v8a", "--no-daemon", "--no-configuration-cache", "--stacktrace"]
