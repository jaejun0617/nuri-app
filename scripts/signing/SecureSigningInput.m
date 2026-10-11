#import <AppKit/AppKit.h>
#import <Security/Security.h>
#import <LocalAuthentication/LocalAuthentication.h>

static NSString *const Service = @"com.nuri.release-signing";
static NSString *const Account = @"credentials-v1";
static NSArray<NSString *> *SecretNames(void) {
  return @[@"NURI_UPLOAD_STORE_PASSWORD", @"NURI_UPLOAD_KEY_ALIAS", @"NURI_UPLOAD_KEY_PASSWORD"];
}
static NSArray<NSString *> *PublicNames(void) {
  return @[@"NURI_UPLOAD_STORE_FILE", @"NURI_APPROVED_SIGNER_SHA256", @"NURI_RELEASE_INPUT_ROOT"];
}
static void Require(BOOL condition) { if (!condition) exit(2); }
static LAContext *NonInteractiveContext(void) {
  LAContext *context = [LAContext new];
  context.interactionNotAllowed = YES;
  return context;
}
static NSMutableDictionary *Query(void) {
  return [@{(__bridge id)kSecClass: (__bridge id)kSecClassGenericPassword,
    (__bridge id)kSecAttrService: Service, (__bridge id)kSecAttrAccount: Account,
    (__bridge id)kSecAttrSynchronizable: @NO} mutableCopy];
}

static NSDictionary<NSString *, NSString *> *ReadStored(void) {
  NSMutableDictionary *query = Query();
  query[(__bridge id)kSecReturnData] = @YES;
  query[(__bridge id)kSecMatchLimit] = (__bridge id)kSecMatchLimitOne;
  query[(__bridge id)kSecUseAuthenticationContext] = NonInteractiveContext();
  CFTypeRef result = NULL;
  OSStatus status = SecItemCopyMatching((__bridge CFDictionaryRef)query, &result);
  if (status == errSecItemNotFound) return nil;
  Require(status == errSecSuccess && result != NULL);
  NSData *data = CFBridgingRelease(result);
  Require([data isKindOfClass:NSData.class]);
  NSDictionary *values = [NSJSONSerialization JSONObjectWithData:data options:0 error:NULL];
  Require([values isKindOfClass:NSDictionary.class]);
  for (id key in values) Require([key isKindOfClass:NSString.class] && [values[key] isKindOfClass:NSString.class]);
  return values;
}

// Metadata-only discovery. Unfamiliar NURI signing items are not read or overwritten.
static NSDictionary *Metadata(void) {
  NSDictionary *query = @{(__bridge id)kSecClass: (__bridge id)kSecClassGenericPassword,
    (__bridge id)kSecReturnAttributes: @YES, (__bridge id)kSecMatchLimit: (__bridge id)kSecMatchLimitAll,
    (__bridge id)kSecUseAuthenticationContext: NonInteractiveContext()};
  CFTypeRef result = NULL;
  OSStatus status = SecItemCopyMatching((__bridge CFDictionaryRef)query, &result);
  if (status == errSecItemNotFound) return @{@"bundle": @NO, @"other": @0};
  Require(status == errSecSuccess && result != NULL);
  NSArray *items = CFBridgingRelease(result);
  Require([items isKindOfClass:NSArray.class]);
  BOOL bundle = NO;
  NSUInteger other = 0;
  for (NSDictionary *item in items) {
    NSString *service = item[(__bridge id)kSecAttrService] ?: @"";
    NSString *account = item[(__bridge id)kSecAttrAccount] ?: @"";
    NSString *label = item[(__bridge id)kSecAttrLabel] ?: @"";
    if ([service isEqual:Service] && [account isEqual:Account]) { bundle = YES; continue; }
    NSString *text = [[NSString stringWithFormat:@"%@ %@ %@", service, account, label] lowercaseString];
    if ([text containsString:@"nuri"] && ([text containsString:@"sign"] || [text containsString:@"upload"] || [text containsString:@"release"])) other++;
  }
  return @{@"bundle": @(bundle), @"other": @(other)};
}

static void RunChild(NSDictionary *values, NSString *node, NSArray *arguments, NSString *root) {
  NSTask *task = [NSTask new];
  task.executableURL = [NSURL fileURLWithPath:node];
  task.arguments = arguments;
  task.environment = values;
  if (root) task.currentDirectoryURL = [NSURL fileURLWithPath:root];
  task.standardInput = NSFileHandle.fileHandleWithNullDevice;
  task.standardOutput = NSFileHandle.fileHandleWithNullDevice;
  task.standardError = NSFileHandle.fileHandleWithNullDevice;
  Require([task launchAndReturnError:NULL]);
  [task waitUntilExit];
  Require(task.terminationStatus == 0);
}

static NSDictionary *Prompt(NSArray<NSString *> *missing) {
  [NSApplication.sharedApplication setActivationPolicy:NSApplicationActivationPolicyAccessory];
  NSAlert *alert = [NSAlert new];
  alert.messageText = @"NURI Release 서명 보안 입력";
  alert.informativeText = @"기존 서명 키의 값을 입력해 주세요. 새 키는 만들지 않습니다. 인증 확인 후 이 Mac의 Keychain에만 저장합니다. 채팅·로그·파일에는 기록하지 않습니다.";
  [alert addButtonWithTitle:@"기존 값 확인 후 안전하게 저장"];
  [alert addButtonWithTitle:@"취소"];
  NSDictionary *labels = @{@"NURI_UPLOAD_STORE_PASSWORD": @"기존 keystore 비밀번호",
    @"NURI_UPLOAD_KEY_ALIAS": @"기존 key alias", @"NURI_UPLOAD_KEY_PASSWORD": @"기존 key 비밀번호"};
  NSView *view = [[NSView alloc] initWithFrame:NSMakeRect(0, 0, 400, missing.count * 74)];
  NSMutableDictionary<NSString *, NSSecureTextField *> *fields = [NSMutableDictionary new];
  for (NSUInteger index = 0; index < missing.count; index++) {
    NSString *name = missing[index];
    CGFloat y = (missing.count - index - 1) * 74;
    NSTextField *label = [NSTextField labelWithString:labels[name]];
    label.frame = NSMakeRect(0, y + 38, 400, 22);
    NSSecureTextField *field = [[NSSecureTextField alloc] initWithFrame:NSMakeRect(0, y + 4, 400, 30)];
    [view addSubview:label]; [view addSubview:field]; fields[name] = field;
  }
  alert.accessoryView = view;
  alert.window.initialFirstResponder = fields[missing.firstObject];
  [NSApplication.sharedApplication activateIgnoringOtherApps:YES];
  Require([alert runModal] == NSAlertFirstButtonReturn);
  NSMutableDictionary *values = [NSMutableDictionary new];
  for (NSString *name in missing) {
    Require(fields[name].stringValue.length > 0);
    values[name] = fields[name].stringValue;
    fields[name].stringValue = @"";
  }
  return values;
}

static void SaveNew(NSDictionary *values) {
  NSMutableDictionary *subset = [NSMutableDictionary new];
  for (NSString *name in [SecretNames() arrayByAddingObjectsFromArray:PublicNames()]) {
    Require([values[name] length] > 0); subset[name] = values[name];
  }
  NSMutableDictionary *query = Query();
  query[(__bridge id)kSecValueData] = [NSJSONSerialization dataWithJSONObject:subset options:0 error:NULL];
  query[(__bridge id)kSecAttrLabel] = @"NURI Release Signing (existing identity)";
  SecAccessRef access = NULL;
  Require(SecAccessCreate(CFSTR("NURI Release signing"), NULL, &access) == errSecSuccess);
  query[(__bridge id)kSecAttrAccess] = (__bridge id)access;
  // Add-only and creator-only ACL. No update, deletion, rotation or allow-all access.
  OSStatus status = SecItemAdd((__bridge CFDictionaryRef)query, NULL);
  CFRelease(access);
  Require(status == errSecSuccess);
  Require([ReadStored() isEqual:subset]);
}

static NSString *RandomPassword(void) {
  unsigned char bytes[32];
  Require(SecRandomCopyBytes(kSecRandomDefault, sizeof(bytes), bytes) == errSecSuccess);
  NSString *value = [[NSData dataWithBytes:bytes length:sizeof(bytes)] base64EncodedStringWithOptions:0];
  volatile unsigned char *wipe = bytes;
  for (NSUInteger i = 0; i < sizeof(bytes); i++) wipe[i] = 0;
  return value;
}

static NSString *ReadProtocolLine(NSFileHandle *input) {
  NSMutableData *line = [NSMutableData new];
  while (line.length < 256) {
    NSData *byte = [input readDataOfLength:1];
    if (!byte.length) break;
    if (((const unsigned char *)byte.bytes)[0] == '\n') break;
    [line appendData:byte];
  }
  return [[NSString alloc] initWithData:line encoding:NSUTF8StringEncoding] ?: @"";
}

static NSString *RotateExistingFile(NSMutableDictionary *values, NSString *root) {
  Require([values[@"NURI_UPLOAD_STORE_PASSWORD"] length] && [values[@"NURI_UPLOAD_KEY_PASSWORD"] length]);
  values[@"NURI_ROTATION_OLD_STORE_PASSWORD"] = values[@"NURI_UPLOAD_STORE_PASSWORD"];
  values[@"NURI_ROTATION_OLD_KEY_PASSWORD"] = values[@"NURI_UPLOAD_KEY_PASSWORD"];
  values[@"NURI_UPLOAD_STORE_PASSWORD"] = RandomPassword();
  values[@"NURI_UPLOAD_KEY_PASSWORD"] = RandomPassword();
  NSTask *task = [NSTask new];
  task.executableURL = [NSURL fileURLWithPath:[values[@"JAVA_HOME"] stringByAppendingPathComponent:@"bin/java"]];
  task.arguments = @[@"-XX:-CreateCoredumpOnCrash", @"-XX:ErrorFile=/dev/null", @"--source", @"17",
    [root stringByAppendingPathComponent:@"scripts/signing/RotateSigningCredentials.java"]];
  task.environment = values;
  NSPipe *commands = [NSPipe pipe];
  NSPipe *protocol = [NSPipe pipe];
  task.standardInput = commands;
  task.standardOutput = protocol;
  task.standardError = NSFileHandle.fileHandleWithNullDevice;
  Require([task launchAndReturnError:NULL]);
  [commands.fileHandleForReading closeFile];
  [protocol.fileHandleForWriting closeFile];
  Require([ReadProtocolLine(protocol.fileHandleForReading) isEqual:@"NURI_ROTATION_READY"]);
  // Persist and read back the new values before authorizing the same-inode write.
  // A failed/cancelled handshake leaves signing fail-closed, never a false READY.
  SaveNew(values);
  [commands.fileHandleForWriting writeData:[@"NURI_ROTATION_COMMIT\n" dataUsingEncoding:NSUTF8StringEncoding]];
  [commands.fileHandleForWriting closeFile];
  NSString *receipt = ReadProtocolLine(protocol.fileHandleForReading);
  [task waitUntilExit];
  Require(task.terminationStatus == 0 && [receipt hasPrefix:@"NURI_ROTATION_COMMITTED:"]);
  NSString *hash = [receipt substringFromIndex:[@"NURI_ROTATION_COMMITTED:" length]];
  Require(hash.length == 64 && [hash rangeOfCharacterFromSet:[[NSCharacterSet characterSetWithCharactersInString:@"0123456789abcdef"] invertedSet]].location == NSNotFound);
  [values removeObjectForKey:@"NURI_ROTATION_OLD_STORE_PASSWORD"];
  [values removeObjectForKey:@"NURI_ROTATION_OLD_KEY_PASSWORD"];
  return hash;
}

static void Emit(NSDictionary *value) {
  NSData *data = [NSJSONSerialization dataWithJSONObject:value options:NSJSONWritingSortedKeys error:NULL];
  Require(data != nil);
  [NSFileHandle.fileHandleWithStandardOutput writeData:data];
}

int main(int argc, const char *argv[]) {
  @autoreleasepool {
    @try {
      Require(argc == 6);
      NSArray<NSString *> *args = NSProcessInfo.processInfo.arguments;
      NSString *mode = args[1];
      Require([@[@"inspect", @"bootstrap", @"release", @"verify", @"rotate"] containsObject:mode]);
      NSDictionary *found = Metadata();
      BOOL bundle = [found[@"bundle"] boolValue];
      NSMutableDictionary *values = [NSProcessInfo.processInfo.environment mutableCopy];
      NSString *manual = @"NONE";
      if ([mode isEqual:@"rotate"]) {
        Require(!bundle && [found[@"other"] unsignedIntegerValue] == 0);
        NSString *hash = RotateExistingFile(values, args[4]);
        RunChild(values, args[2], @[args[3], @"verify-injected"], nil);
        Emit(@{@"KEYSTORE": @"READY", @"SIGNER_REFERENCE": @"READY",
          @"STORE_PASSWORD": @"AVAILABLE_SECURELY", @"KEY_ALIAS": @"AVAILABLE_SECURELY", @"KEY_PASSWORD": @"AVAILABLE_SECURELY",
          @"SECURE_STORE": @"MACOS_KEYCHAIN", @"PO_MANUAL_ACTION_REQUIRED": @"NONE", @"RELEASE_SIGNING_ENV": @"READY",
          @"NEW_KEYSTORE_FILE_SHA256": hash, @"OLD_STORE_PASSWORD": @"REVOKED", @"OLD_KEY_PASSWORD": @"REVOKED"});
        return 0;
      }
      if (![mode isEqual:@"inspect"] && bundle) {
        NSDictionary *stored = ReadStored(); Require(stored != nil);
        for (NSString *name in PublicNames()) {
          if (([mode isEqual:@"release"] || [mode isEqual:@"verify"]) && ![name isEqual:@"NURI_APPROVED_SIGNER_SHA256"]) {
            Require([stored[name] length] > 0); values[name] = stored[name];
          } else Require([stored[name] isEqual:values[name]]);
        }
        for (NSString *name in SecretNames()) { Require([stored[name] length] > 0); values[name] = stored[name]; }
      }
      NSMutableArray *missing = [NSMutableArray new];
      for (NSString *name in SecretNames()) if (![values[name] length]) [missing addObject:name];
      if ([found[@"other"] unsignedIntegerValue] > 0 && !bundle && missing.count) {
        Emit(@{@"KEYSTORE": @"READY", @"SIGNER_REFERENCE": @"READY", @"STORE_PASSWORD": @"UNKNOWN",
          @"KEY_ALIAS": @"UNKNOWN", @"KEY_PASSWORD": @"UNKNOWN", @"SECURE_STORE": @"EXISTING_ITEMS_REQUIRE_REVIEW",
          @"UNKNOWN_MATCHING_ITEMS": found[@"other"], @"PO_MANUAL_ACTION_REQUIRED": @"NONE", @"RELEASE_SIGNING_ENV": @"BLOCKED"});
        return 0;
      }
      if ([mode isEqual:@"bootstrap"]) {
        if (missing.count) { [values addEntriesFromDictionary:Prompt(missing)]; manual = @"ONE_SECURE_LOCAL_INPUT"; }
        RunChild(values, args[2], @[args[3], @"verify-injected"], nil);
        if (!bundle) SaveNew(values);
      }
      if ([mode isEqual:@"release"]) {
        Require(bundle && missing.count == 0);
        RunChild(values, args[2], @[args[3], @"verify-injected"], nil);
        RunChild(values, args[2], @[args[3], @"run-injected", args[5], @"qa"], args[4]);
      }
      if ([mode isEqual:@"verify"]) {
        Require(bundle && missing.count == 0);
        RunChild(values, args[2], @[args[3], @"verify-injected"], nil);
      }
      BOOL ready = ![mode isEqual:@"inspect"];
      NSString *(^state)(NSString *) = ^NSString *(NSString *name) {
        if (ready) return @"AVAILABLE_SECURELY";
        if (bundle) return @"UNKNOWN";
        return [missing containsObject:name] ? @"MISSING_SECURELY" : @"AVAILABLE_SECURELY";
      };
      Emit(@{@"KEYSTORE": @"READY", @"SIGNER_REFERENCE": @"READY",
        @"STORE_PASSWORD": state(SecretNames()[0]), @"KEY_ALIAS": state(SecretNames()[1]), @"KEY_PASSWORD": state(SecretNames()[2]),
        @"SECURE_STORE": (bundle || ready) ? @"MACOS_KEYCHAIN" : (missing.count < 3 ? @"PROTECTED_PROCESS_ENVIRONMENT" : @"MISSING"),
        @"PO_MANUAL_ACTION_REQUIRED": (!ready && missing.count && !bundle) ? @"ONE_SECURE_LOCAL_INPUT" : manual,
        @"RELEASE_SIGNING_ENV": ready ? @"READY" : @"BLOCKED"});
      return 0;
    } @catch (NSException *ignored) { return 2; }
  }
}
