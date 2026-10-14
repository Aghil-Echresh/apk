#!/usr/bin/env python3
"""Patch the known Virtual Walkie Talkie Pro APK's binary AndroidManifest.xml.

This only adjusts manifest values. It does not re-sign the APK or add runtime
permission-request code. Run only on the exact original APK version described
in COMPATIBILITY-REVIEW.md and verify the resulting package before installing.
"""
from __future__ import annotations
import argparse
import struct
import zipfile
from pathlib import Path

# Offsets verified against the uploaded original APK's binary XML chunks.
# Fail closed if the input is not the expected original release.
TARGET_SDK_VALUE_OFFSET = 3284
VERSION_CODE_VALUE_OFFSET = 2168
EXPECTED_TARGET_SDK = 22
EXPECTED_VERSION_CODE = 28
NEW_TARGET_SDK = 24
NEW_VERSION_CODE = 29


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_apk", type=Path)
    parser.add_argument("output_manifest", type=Path, help="Path to write the patched AndroidManifest.xml")
    args = parser.parse_args()

    with zipfile.ZipFile(args.input_apk, "r") as archive:
        manifest = bytearray(archive.read("AndroidManifest.xml"))

    if len(manifest) != 4160:
        raise SystemExit(f"Unexpected manifest size: {len(manifest)} bytes")
    current_target = struct.unpack_from("<I", manifest, TARGET_SDK_VALUE_OFFSET)[0]
    current_version = struct.unpack_from("<I", manifest, VERSION_CODE_VALUE_OFFSET)[0]
    if (current_target, current_version) != (EXPECTED_TARGET_SDK, EXPECTED_VERSION_CODE):
        raise SystemExit(
            "Input does not match expected original (targetSdk=22, versionCode=28); "
            f"found targetSdk={current_target}, versionCode={current_version}."
        )

    struct.pack_into("<I", manifest, TARGET_SDK_VALUE_OFFSET, NEW_TARGET_SDK)
    struct.pack_into("<I", manifest, VERSION_CODE_VALUE_OFFSET, NEW_VERSION_CODE)
    args.output_manifest.parent.mkdir(parents=True, exist_ok=True)
    args.output_manifest.write_bytes(manifest)
    print(f"Wrote patched manifest: {args.output_manifest}")
    print(f"targetSdkVersion: {current_target} -> {NEW_TARGET_SDK}")
    print(f"versionCode: {current_version} -> {NEW_VERSION_CODE}")
    print("Next: rebuild the APK archive and sign with a new key; see COMPATIBILITY-REVIEW.md.")


if __name__ == "__main__":
    main()
