import { AndroidReleaseService } from '../server/services/androidReleaseService.js';
import { Repository } from '../server/db/repository.js';
import crypto from 'crypto';
import fs from 'fs';

async function runAndroidReleaseTests() {
  console.log('🧪 Starting PaySync Android Release Management Test Suite...\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    }
  }

  // Test 1: Artifact generation and validation
  try {
    const artifacts = AndroidReleaseService.ensureReleaseArtifactsExist();
    assert(
      fs.existsSync(artifacts.v120.filePath) && artifacts.v120.fileSize > 0,
      'Test 1: Release APK v1.2.0 exists physically on disk with valid byte size',
      `Size: ${artifacts.v120.fileSize} bytes`
    );

    // Test 2: Cryptographic SHA-256 accuracy
    const calculatedHash = AndroidReleaseService.calculateFileSha256(artifacts.v120.filePath);
    assert(
      calculatedHash === artifacts.v120.sha256 && calculatedHash.length === 64,
      'Test 2: Computed SHA-256 hash matches 64-char hexadecimal digest',
      `Hash: ${calculatedHash}`
    );

    // Test 3: APK zip structure and manifest inspection
    const metadata = AndroidReleaseService.inspectAndValidateApk(artifacts.v120.filePath);
    assert(
      metadata.isValid && metadata.targetSdk === 34 && metadata.minSdk === 26,
      'Test 3: APK internal structure inspection validates targetSdk=34 and minSdk=26',
      `Target: ${metadata.targetSdk}, Min: ${metadata.minSdk}`
    );

    // Test 4: Repository queries for latest published release
    const latest = await Repository.getLatestPublishedRelease();
    assert(
      latest !== null && latest.version === '1.2.0' && latest.isLatest === true && latest.isPublished === true,
      'Test 4: Repository correctly retrieves latest official published release (v1.2.0)',
      `Retrieved: ${latest?.version}`
    );

    // Test 5: Repository release creation & promotion to latest
    const createdRelease = await Repository.createAndroidRelease({
      version: '1.4.0-test',
      versionCode: 140,
      releaseNotes: 'Automated test build for regression verification',
      fileName: 'PaySync-MFS-Collector-v1.4.0-test.apk',
      fileSize: 18874368,
      downloadUrl: '/api/android/releases/rel_test_140/download',
      sha256: crypto.randomBytes(32).toString('hex'),
      isPublished: true,
      isLatest: true,
    });

    const refreshedLatest = await Repository.getLatestPublishedRelease();
    assert(
      refreshedLatest?.version === '1.4.0-test' && refreshedLatest?.isLatest === true,
      'Test 5: New release created and automatically promoted as latest (unsetting previous latest)',
      `Current Latest: ${refreshedLatest?.version}`
    );

    // Revert latest back to v1.2.0
    const v120 = await Repository.getAndroidReleaseByVersion('1.2.0');
    if (v120) {
      await Repository.setLatestAndroidRelease(v120.id);
    }
    await Repository.deleteAndroidRelease(createdRelease.id);

    const revertedLatest = await Repository.getLatestPublishedRelease();
    assert(
      revertedLatest?.version === '1.2.0',
      'Test 6: Restored latest release back to v1.2.0 and cleaned up test artifact',
      `Restored: ${revertedLatest?.version}`
    );

    // Test 7: Path traversal defense
    const traversalAttack1 = AndroidReleaseService.resolveSafeApkPath('../../../etc/passwd');
    const traversalAttack2 = AndroidReleaseService.resolveSafeApkPath('..\\..\\windows\\system32\\cmd.exe');
    assert(
      traversalAttack1 === null && traversalAttack2 === null,
      'Test 7: Security - Path traversal attack vectors safely sanitized and blocked'
    );

    // Test 8: Download counter atomic increment
    const initialCount = v120?.downloadCount || 0;
    if (v120) {
      await Repository.incrementAndroidReleaseDownloadCount(v120.id);
      const updatedV120 = await Repository.getAndroidReleaseById(v120.id);
      assert(
        (updatedV120?.downloadCount || 0) === initialCount + 1,
        'Test 8: Telemetry - Download counter increments atomically on each download event',
        `Count: ${updatedV120?.downloadCount}`
      );
    }

  } catch (err: any) {
    console.error('Test execution error:', err);
    assert(false, 'Test suite execution completed without uncaught exceptions', err.message);
  }

  console.log(`\n📊 Android Release Test Results: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)\n`);
  if (passed !== total) {
    process.exit(1);
  }
}

runAndroidReleaseTests();
