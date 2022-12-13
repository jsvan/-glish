"""
Started with common word list from
https://en.wiktionary.org/wiki/Wiktionary:Frequency_lists/A_Frequency_Dictionary_of_Contemporary_American_English

Try words from https://en.wiktionary.org/wiki/animal/translations#Noun first, then
https://en.wiktionary.org/wiki/WORD

Scrape wiktionary for all translations for a word
"""

import requests
import time
from bs4 import BeautifulSoup


def main():

	with open('../updated_language_packs/eng_todo.txt') as F:
		listofenglishwords = F.read().split('\n')

	with open('../languagepacks/available_languages.txt') as F:
		lang_name2short = {x.split('\t')[0]:x.split('\t')[1] for x in F.read().split('\n')}
		all_languages = {uppercase(x):dict() for x in lang_name2short.keys()}

	i = 0
	for i, word in enumerate(listofenglishwords):
		try:
			print('\r', i, '/', len(listofenglishwords), end='')
			tbls_to_filled_dict(word, all_languages)

		except KeyboardInterrupt as e:
			worderror(cpl_language_dict, word)
			input("Keyboard Interrupt detected. Waiting for button press...")

	print("\nsaving to disk")
	save_dict(all_languages, listofenglishwords)


def tbls_to_filled_dict(word, cpl_language_dict):
	tbls = None
	err = False
	try:
		tbls = getTBLs("https://en.wiktionary.org/wiki/" + word + "/translations#Noun",  word)
	except KeyboardInterrupt as e:
		print("Was working on", word)
		err = True
		input("Keyboard Interrupt detected. Waiting for button press...")
	except Exception as e:
		print(e, e.__doc__)

	finally:
		try:
			if not tbls:
				if err:
					print("Continuing with", word)
					err = False
				tbls = getTBLs("https://en.wiktionary.org/wiki/" + word, word)
			if tbls:
					first = True
					for tbl in tbls:
						addTranslatedWords(tbl, cpl_language_dict, word, first)
						first = False
			else:
				worderror(cpl_language_dict, word)

		# urllib3.exceptions.ProtocolError, requests.exceptions.ConnectionError, http.client.RemoteDisconnected, requests.exceptions.ReadTimeout, urllib3.exceptions.ReadTimeoutError, TimeoutError
		except KeyboardInterrupt as e:
			input("Keyboard Interrupt detected. Waiting for button press...")
			worderror(cpl_language_dict, word)
		except Exception as e:
			print(e, e.__doc__)
			worderror(cpl_language_dict, word)


def getTBLs(url, word):
	time.sleep(0.3)
	r = requests.get(url, timeout=10)
	html = r.content
	soup = BeautifulSoup(html, parser='lxml')
	frames = [frame for frame in soup.find_all('div', { 'class' : 'NavFrame' }) if "id" in frame.attrs and frame["id"].startswith("Translation") ]
	return frames


"""
Takes the dictionary of {LANGS:{WORDS:set()}}
Updates the dictionary in place
fills word sets
tbls are found vocab tables on wikipedia (getTBLS(url))
cpl_lang_dict must be initialized with {LANGS(capitlized):dict()}...}
"""
def addTranslatedWords(tbl, cpl_lang_dict, word, first):
	def getlangname(li):
		try:
			return li.find('a')['href'].split('#')[1]
		except (TypeError, IndexError):
			return "--"
	def getwords(li):
		links = li.find_all('a')
		translated_words = []
		i = 0
		while i < len(links):
			if 'class' in links[i].attrs:
				break
			translated_words.append(links[i].get_text())
			i += 2
		return translated_words

	lis = tbl.find_all('li')
	for li in lis:
		lang = getlangname(li)
		if lang not in cpl_lang_dict:
			continue

		gotwords = getwords(li)
		if word not in cpl_lang_dict[lang]:
			if first:
				firstword = "--" if len(gotwords) < 1 else gotwords[0]
				cpl_lang_dict[lang][word] = (firstword, set())
			else:
				cpl_lang_dict[lang][word] = ("--", set())

		cpl_lang_dict[lang][word][1].update(gotwords)

def uppercase(x):
	return x[0].upper()+x[1:]

def worderror(cpl_language_dict, word):
	print("Word error on", word)
	for lang in cpl_language_dict.keys():
		cpl_language_dict[lang][word] = None


def save_dict(all_languages, listofenglishwords):
	dr = "../updated_language_packs/"
	for lang in all_languages.keys():
		with open(dr + lang + ".txt", "w") as F:
			for engword in listofenglishwords:
				if engword in all_languages[lang]:
					if all_languages[lang][engword]:
						F.write(all_languages[lang][engword][0]+'#'+' '.join(all_languages[lang][engword][1])+'\n')
					else:
						F.write('ERROR\n')
				else:
					F.write('--\n')

if __name__ == "__main__":
	main()
