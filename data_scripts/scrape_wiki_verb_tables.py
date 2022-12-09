from bs4 import BeautifulSoup
import requests
import re
import json
import time
LANG_PACK = "../languagepacks/"
WIKI_TABLE_PACK = LANG_PACK + "wiki_verb_tables/"
URL = lambda x: "https://en.wiktionary.org/wiki/"+x
IFRAME_CONST = lambda x: f"""<iframe width="550px" height="350px" srcdoc='{x}'></iframe>"""
# Cut out regexes from html tables we collect to save on space. Can drop html size by like 40% (no citation).
REGEXES = ["href=\".*?\"", "<sup.*?</sup>", "class=\".*?\"", "<a.*?>", "</a>", "\n"]
LANG_DICT = {}
ENG_INFO = []


def main():
    prepareLangLists()
    scrape_wiki()


def scrape_wiki():
    for lang, words in LANG_DICT.items():
        print("Doing lang")
        worddict = dict()
        for i, word in enumerate(words):
            print(f"\r{i} / {len(words)}")
            htmltable = " "
            try:
                r=requests.get(URL(word))
                html=r.content
                soup = BeautifulSoup(html, parser='lxml')
                htmltable = str(soup.find('div', { 'class' : 'NavFrame' }))
                for regex in REGEXES:
                    htmltable = re.sub(regex, "", htmltable)
            except Exception as e:
                print(i, word)
                print(e, e.__doc__)

            formatted_table = IFRAME_CONST(htmltable)
            worddict[word] = formatted_table
            time.sleep(0.50)

        with open(WIKI_TABLE_PACK + lang + ".json", "w") as F:
            json.dump(worddict, F)



def prepareLangLists():
    global LANG_DICT
    global ENG_INFO

    with open(LANG_PACK + "available_languages.txt") as F:
        lang_list = [x.split('\t')[0] for x in F.read().split("\n")]

    sr, word, pos, level = 0, 1, 2, 3
    with open(LANG_PACK + "english3000.tsv") as F:
        # ENG_INFO = [x.split('\t')[pos] for x in F.read().split("\n")]
        for i, x in enumerate(F.read().split("\n")):
            try:
                ENG_INFO.append(x.split('\t')[pos])
            except:
                print(i, x)

    for lang in lang_list:
        with open(LANG_PACK + lang + ".txt") as F:
            words = []
            # words = [x.split('\t')[1] for x in F.read().split('\n') if x.strip()]
            for i, x in enumerate(F.read().split('\n')):
                try:
                    if x.strip():
                        words.append(x.split("\t")[1])
                except:
                    print(lang)
                    print(i, x)

        grablist = []
        for i in range(len(words)):
            if "adverb" not in ENG_INFO[i] and "v" in ENG_INFO[i]:
                grablist.append(words[i])

        LANG_DICT[lang] = grablist






if __name__ == "__main__":
    main()


# TODO: Grab wiki table of english verb form to map to foreign wikitable as well. Maybe wiki tables can be in map of {IDX: TABLES}, and english verbs + conjugations can point to IDX. What about using a stemmer? Is it lightweight? Stemming would be a huge win.
#




