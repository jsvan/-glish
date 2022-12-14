from bs4 import BeautifulSoup
import requests
import re
import json
import time
LANG_PACK = "../languagepacks/"
WIKI_TABLE_PACK = LANG_PACK + "wiki_verb_tables/"
URL = lambda x: "https://en.wiktionary.org/wiki/"+x
IFRAME_CONST = lambda x: f"""<iframe srcdoc='{x}'></iframe>"""
SHORTFORM_SEARCH = lambda x: f'lang="{x}"'
# Cut out regexes from html tables we collect to save on space. Can drop html size by like 40% (no citation).
REGEXES = ["href=\".*?\"", "<sup.*?</sup>", "class=\".*?\"", "<a.*?>", "</a>", "<div.*?>", "</div>", "\n"]
LANG_DICT = {}
SHORTFORM_LANGS = {}
ENG_INFO = []

"""
TODO: Arabic doesn't render unicode (but Chinese does ???).
TODO: Use en.wiktionary.org/wiki/ENGLISH_WORD#Translations to find translations into every language. I think this is what i should use.
		It uses ::marker then the language name, then a list of <span> with text association with the translation word.

"""

def main():
	prepareLangLists()
	scrape_wiki()


def scrape_wiki():
	for lang, words in LANG_DICT.items():
		print(lang)
		if lang =='chinese' or lang == 'arabic' or lang =='zh' or lang == 'ar':
			print("SKIPPING")
			continue

		print("Doing lang", lang)
		shortformsearch = SHORTFORM_SEARCH(SHORTFORM_LANGS[lang])
		print("Shortform::", shortformsearch)
		worddict = dict()
		for i, word in enumerate(words):
			print(f"\r{i} / {len(words)}", end='')
			htmltable = " "
			try:
				time.sleep(0.40)
				r=requests.get(URL(word), timeout=5)
				html=r.content
				soup = BeautifulSoup(html, parser='lxml')
				htmltables = soup.find_all('div', { 'class' : 'NavFrame' })
				htmltable = None
				for tbl in htmltables:
					strtbl = str(tbl)
					if shortformsearch in strtbl:
						htmltable = strtbl
						break

				if not htmltable:
					print(shortformsearch, word, URL(word), lang, "MISSING!!!!!")
					continue

				for regex in REGEXES:
					htmltable = re.sub(regex, "", htmltable)

				formatted_table = IFRAME_CONST(htmltable)
				worddict[word] = formatted_table

			except Exception as e:
				print(i, word)
				print(e, e.__doc__)



		with open(WIKI_TABLE_PACK + lang + ".json", "w") as F:
			json.dump(worddict, F)



def prepareLangLists():
	global LANG_DICT
	global ENG_INFO
	global SHORTFORM_LANGS

	with open(LANG_PACK + "available_languages.txt") as F:
		f = F.read().split("\n")
		lang_list = [x.split('\t')[0] for x in f]
		#yeah this is inefficient and stupid but i dont care, its a file of like 12 lines.
		SHORTFORM_LANGS = {x.split('\t')[0]: x.split('\t')[1] for x in f}

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
		word = None
		for i in range(len(words)):
			if "adverb" not in ENG_INFO[i] and ("v." in ENG_INFO[i] or "verb" in ENG_INFO[i]):
				word = words[i]
				if not word.isalpha():
					if ' ' in word:
						word = max([y for y in word.split(' ') if '(' not in y], key=len)
					word = ''.join((x for x in word if x.isalpha()))

				grablist.append(word.lower())
		LANG_DICT[lang] = grablist
		print(lang)
		print(grablist)
		print('\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n')






if __name__ == "__main__":
	main()


# TODO: Grab wiki table of english verb form to map to foreign wikitable as well. Maybe wiki tables can be in map of {IDX: TABLES}, and english verbs + conjugations can point to IDX. What about using a stemmer? Is it lightweight? Stemming would be a huge win.
#




"""
German errors

HTTPSConnectionPool(host='en.wiktionary.org', port=443): Max retries exceeded with url: /wiki/vertrauen (Caused by NewConnectionError('<urllib3.connection.HTTPSConnection object at 0x7f7db2b16e60>: Failed to establish a new connection: [Errno -2] Name or service not known')) A Connection error occurred.
582 / 799582 bleiben
HTTPSConnectionPool(host='en.wiktionary.org', port=443): Max retries exceeded with url: /wiki/bleiben (Caused by NewConnectionError('<urllib3.connection.HTTPSConnection object at 0x7f7db2b16fb0>: Failed to establish a new connection: [Errno -2] Name or service not known')) A Connection error occurred.
583 / 799583 anmerkung
HTTPSConnectionPool(host='en.wiktionary.org', port=443): Max retries exceeded with url: /wiki/anmerkung (Caused by NewConnectionError('<urllib3.connection.HTTPSConnection object at 0x7f7db2b16ad0>: Failed to establish a new connection: [Errno -2] Name or service not known')) A Connection error occurred.
584 / 799584 denken
HTTPSConnectionPool(host='en.wiktionary.org', port=443): Max retries exceeded with url: /wiki/denken (Caused by NewConnectionError('<urllib3.connection.HTTPSConnection object at 0x7f7db2b16b30>: Failed to establish a new connection: [Errno -2] Name or service not known')) A Connection error occurred.
585 / 799585 erinnern
HTTPSConnectionPool(host='en.wiktionary.org', port=443): Max retries exceeded with url: /wiki/erinnern (Caused by NewConnectionError('<urllib3.connection.HTTPSConnection object at 0x7f7db2b16c50>: Failed to establish a new connection: [Errno -2] Name or service not known')) A Connection error occurred.
586 / 799586 löschen
HTTPSConnectionPool(host='en.wiktionary.org', port=443): Max retries exceeded with url: /wiki/l%C3%B6schen (Caused by NewConnectionError('<urllib3.connection.HTTPSConnection object at 0x7f7db2b16980>: Failed to establish a new connection: [Errno -2] Name or service not known')) A Connection error occurred.
587 / 799587 miete
HTTPSConnectionPool(host='en.wiktionary.org', port=443): Max retries exceeded with url: /wiki/miete (Caused by NewConnectionError('<urllib3.connection.HTTPSConnection object at 0x7f7db2b16f80>: Failed to establish a new connection: [Errno -2] Name or service not known')) A Connection error occurred.
588 / 799588 reparatur
HTTPSConnectionPool(host='en.wiktionary.org', port=443): Max retries exceeded with url: /wiki/reparatur (Caused by NewConnectionError('<urllib3.connection.HTTPSConnection object at 0x7f7db2b16bf0>: Failed to establish a new connection: [Errno -2] Name or service not known')) A Connection error occurred.
589 / 799589 wiederholen
HTTPSConnectionPool(host='en.wiktionary.org', port=443): Max retries exceeded with url: /wiki/wiederholen (Caused by NewConnectionError('<urllib3.connection.HTTPSConnection object at 0x7f7db2b16830>: Failed to establish a new connection: [Errno -2] Name or service not known')) A Connection error occurred.
590 / 799590 ersetzen
HTTPSConnectionPool(host='en.wiktionary.org', port=443): Max retries exceeded with url: /wiki/ersetzen (Caused by NewConnectionError('<urllib3.connection.HTTPSConnection object at 0x7f7db2b16c80>: Failed to establish a new connection: [Errno -2] Name or service not known')) A Connection error occurred.
591 / 799591 antwort
HTTPSConnectionPool(host='en.wiktionary.org', port=443): Max retries exceeded with url: /wiki/antwort (Caused by NewConnectionError('<urllib3.connection.HTTPSConnection object at 0x7f7db2b16f20>: Failed to establish a new connection: [Errno -2] Name or service not known')) A Connection error occurred.
592 / 799592 bericht
HTTPSConnectionPool(host='en.wiktionary.org', port=443): Max retries exceeded with url: /wiki/bericht (Caused by NewConnectionError('<urllib3.connection.HTTPSConnection object at 0x7f7db2b16e60>: Failed to establish a new connection: [Errno -2] Name or service not known')) A Connection error occurred.
593 / 799593 vertreten
HTTPSConnectionPool(host='en.wiktionary.org', port=443): Max retries exceeded with url: /wiki/vertreten (Caused by NewConnectionError('<urllib3.connection.HTTPSConnection object at 0x7f7db2b16fb0>: Failed to establish a new connection: [Errno -2] Name or service not known')) A Connection error occurred.
594 / 799594 anfrage
HTTPSConnectionPool(host='en.wiktionary.org', port=443): Max retries exceeded with url: /wiki/anfrage (Caused by NewConnectionError('<urllib3.connection.HTTPSConnection object at 0x7f7db2b16ad0>: Failed to establish a new connection: [Errno -2] Name or service not known')) A Connection error occurred.

"""
