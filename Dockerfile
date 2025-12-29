FROM reactnativecommunity/react-native-android:latest

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install

COPY . .

WORKDIR /app/android

RUN chmod +x gradlew

CMD ["./gradlew", "assembleRelease", "bundleRelease", "--no-configuration-cache", "--stacktrace"]