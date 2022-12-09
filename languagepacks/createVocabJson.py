"""
 Words taken from https://3000mostcommonwords.com/3000-most-common-english-words/
 Translations from https://glosbe.com/en/
 and https://www.collinsdictionary.com/dictionary/
"""

import requests
from bs4 import BeautifulSoup as bs
import json
import time
from pprint import pprint as pp

class Translator:
    def __init__(self):
        self.SHORT, self.LONG = 0, 1

        self.URLs = [lambda lang, word: "https://glosbe.com/en/" + lang + "/" + word,
                     lambda lang, word: "https://www.collinsdictionary.com/dictionary/english-" + lang + "/" + word]

        self.classtags = ['translation__item__phrase',
                          'cit type-translation']

        self.languages = [['es', 'spanish'],
                          ['de', 'german'],
                          ['cs', 'czech'],
                          ['fr', 'french'],
                          ['zh', 'chinese']]

    def translate_json(self):

        # Requires original json of type
        """
        {"words": 
            {"a, an": 
                {"pos": "indefinite, article", 
                 "level": "a1", 
                 "es": "", 
                 "de": "", 
                 "cs": ""}, 
            "abandon": 
                {"pos": "verb", "level": "b2", "es": "", "de": "", "cs": ""}, 
            "ability": 
                {"pos": "noun", "level": "a2", "es": "", "de": "", "cs": ""}, 
            "able": 
                {"pos": "adjective.", "level": "a2", "es": "", "de": "", "cs": ""}, 
        """
        # etc. Required is the head "words" node, then a dict of words to at least {pos}.
        # Recommended to lowercase input file before translation.

        with open("traitorous_lang_dump.json") as F:
            jsonwords = json.load(F)

        prepwords_to_delete = []
        doublewords = []
        spacewords = []
        problemwords = []
        jsonwords['language'] = dict()
        for short, long in self.languages:
            jsonwords['language'][long] = short

        for shortlonglang in languages:

            print(shortlonglang[self.LONG])

            for i, (w, junk) in enumerate(jsonwords['words'].items()):
                word = w

                if ',' in word:
                    print("Double word:", word)
                    word = word.split(',')[0].strip()
                    if num_prl == 1:
                        doublewords.append(w)

                if ' ' in word:
                    word = word.split(' ')[0].strip()
                    if num_prl == 1:
                        spacewords.append(w)

                if not word.isalpha():
                    word = ''.join(x for x in word if x.isalpha())

                if 'prep' in junk['pos']:
                    # Don't bother with prepositions
                    if num_prl == 1:
                        # only add once, choose cz because easily identifiable
                        prepwords_to_delete.append(w)
                    continue

                self.get_word()

        pp([{x:jsonwords['words'][x]} for x in jsonwords['words'] if x < 'acquire'])
        print(prepwords_to_delete)

        print("deleting preposition words from dict")

        for word in prepwords_to_delete:
            del jsonwords['words'][word]


        print("dumping")
        with open("populated_traitorous_lang_dump.json", 'w') as F:
            json.dump(jsonwords, F)

        print("Finished dumping. Ending...")

        print("\n\n\t\tdoubled words\n", doublewords)
        print("\n\n\t\tspace words:\n", spacewords)
        print("\n\n\t\tproblem words:\n", problemwords)

    def get_word(self, lang, word, wordfrommem):
        translated = wordfrommem(lang[self.SHORT], word)
        if not translated:
            translated = self.scrape_word(lang, word)

    def word_from_mem(self, languages):
        def pull_lang(lang):
            with open(lang + ".tsv") as F:
                vocab = [x.split('\t') for x in F.read().split('\n')]
            return vocab
        mem_vocab = dict()
        for shortlang, longlang in languages:
            vocab = pull_lang(shortlang)
            for eng, foreign in vocab:
                if eng not in mem_vocab:
                    mem_vocab[eng] = dict()
                mem_vocab[eng][shortlang] = foreign
        def locate_or_no(lang, eng):
            if eng not in mem_vocab or lang not in mem_vocab[eng]:
                return ''
            return mem_vocab[eng][lang]
        return locate_or_no

    def scrape_word(self, lang, word):
        delay = .4
        firsttranslation = ''

        try:
            url = self.URLs[0](lang[0], word)
            classtag = self.classtags[0]
            page = requests.get(url,  headers={'user-agent': 'my-app/0.0.1'})
            print(url, '\n', page)
            res = bs(page.content, "lxml").find_all('span', attrs={"class":classtag})
            firsttranslation = res[0].text.strip()
            time.sleep(delay)
        except Exception as e:
            print("PROBLEM:", e, e.__doc__)
            problemwords.append(w)
            try:
                print(page)
            except:
                pass

        return firsttranslation
