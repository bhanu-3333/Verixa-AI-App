import os
import json
import xml.etree.ElementTree as ET
from typing import List, Dict

class AvatarService:
    def __init__(self):
        # Resolve path to assets and static directories relative to this file
        current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.assets_dir = os.path.join(current_dir, "assets")
        self.static_dir = os.path.join(current_dir, "static")
        
        # Load the dynamic vocabulary sign map
        map_path = os.path.join(self.assets_dir, "sign_map.json")
        try:
            with open(map_path, "r", encoding="utf-8") as f:
                self.sign_map: Dict = json.load(f)
        except Exception as e:
            print(f"Error loading sign_map.json: {e}")
            self.sign_map = {"letters": {}, "numbers": {}}

    def translate_text_to_sigml(self, text: str) -> str:
        """
        Tokenizes text, resolves each word to a pre-defined sign or falls back 
        to fingerspelling, and merges the XML sign tags into a single unified <sigml> payload.
        """
        if not text or not text.strip():
            return '<?xml version="1.0" encoding="utf-8"?>\n<sigml></sigml>'

        # Normalize text: lowercase and split into words
        normalized = text.lower().strip()
        words = normalized.split()
        
        all_signs: List[ET.Element] = []

        for word in words:
            # Strip simple punctuation from the word edges
            clean_word = word.strip(".,?!;:-")
            if not clean_word:
                continue

            # 1. Check if word has a pre-defined full sign gesture (must map to a string path)
            if clean_word in self.sign_map and isinstance(self.sign_map[clean_word], str):
                sigml_path = self.sign_map[clean_word]
                signs = self._load_hns_signs(sigml_path)
                if signs:
                    all_signs.extend(signs)
                    continue

            # 2. Fall back to fingerspelling letter-by-letter
            for char in clean_word:
                if char in self.sign_map.get("letters", {}):
                    letter_path = self.sign_map["letters"][char]
                    signs = self._load_hns_signs(letter_path)
                    if signs:
                        all_signs.extend(signs)
                elif char in self.sign_map.get("numbers", {}):
                    number_path = self.sign_map["numbers"][char]
                    signs = self._load_hns_signs(number_path)
                    if signs:
                        all_signs.extend(signs)

        # Stitch all extracted <hns_sign> elements into a single <sigml> root container
        root = ET.Element("sigml")
        for sign in all_signs:
            root.append(sign)

        # Convert back to standard string format
        try:
            # encoding="unicode" returns a plain str with no embedded declaration
            xml_str = ET.tostring(root, encoding="unicode")
            return '<?xml version="1.0" encoding="utf-8"?>\n' + xml_str
        except Exception as e:
            print(f"Error building output XML: {e}")
            return '<?xml version="1.0" encoding="utf-8"?>\n<sigml></sigml>'

    def _load_hns_signs(self, relative_path: str) -> List[ET.Element]:
        """
        Loads a local SiGML XML file and extracts all its inner <hns_sign> elements.
        Supports namespaced XML configurations by resolving the local name suffix.
        """
        full_path = os.path.join(self.static_dir, relative_path)
        if not os.path.exists(full_path):
            print(f"SiGML asset file not found: {full_path}")
            return []

        try:
            tree = ET.parse(full_path)
            root = tree.getroot()
            # Extract sign elements: hamgestural_sign (standard SiGML) or hns_sign (legacy)
            # Uses tag suffix matching to handle optional XML namespace prefixes
            SIGN_TAGS = {"hamgestural_sign", "hns_sign"}
            signs = [el for el in root.iter() if el.tag.split("}")[-1] in SIGN_TAGS]
            return signs
        except Exception as e:
            print(f"Failed to parse XML file {full_path}: {e}")
            return []
