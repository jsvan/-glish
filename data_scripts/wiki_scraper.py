import requests
import time
from bs4 import BeautifulSoup

class Scraper:

	def __init__(self):
		with open('../languagepacks/available_languages.txt') as F:
    		self.lang_name2short = {x.split('\t')[0]:x.split('\t')[1] for x in F.read().split('\n')}
    		self.cpl_language_dict = {self.uppercase(x):dict() for x in lang_name2short.keys()}

	def html_to_filled_vocab_dict(self, word):
		tbls = None
		err = False
		try:
			tbls = self._getTBLs("https://en.wiktionary.org/wiki/" + word + "/translations#Noun",  word)
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
					tbls = self._getTBLs("https://en.wiktionary.org/wiki/" + word, word)
				if tbls:
						first = True
						for tbl in tbls:
							self._addTranslatedWords(tbl, self.cpl_language_dict, word, first)
							first = False
				else:
					self._worderror(self.cpl_language_dict, word)

			# urllib3.exceptions.ProtocolError, requests.exceptions.ConnectionError, http.client.RemoteDisconnected, requests.exceptions.ReadTimeout, urllib3.exceptions.ReadTimeoutError, TimeoutError
			except KeyboardInterrupt as e:
				input("Keyboard Interrupt detected. Waiting for button press...")
				self._worderror(self.cpl_language_dict, word)
			except Exception as e:
				print(e, e.__doc__)
				self._worderror(self.cpl_language_dict, word)


	def _getTBLs(self, url, word):
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
	tbls are found vocab tables on wikipedia (self._getTBLs(url))
	self.cpl_language_dict must be initialized with {LANGS(capitlized):dict()}...}
	"""
	def _addTranslatedWords(self, tbl, word, first):
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
			if lang not in self.cpl_language_dict:
				continue

			gotwords = getwords(li)
			if word not in self.cpl_language_dict[lang]:
				if first:
					firstword = "--" if len(gotwords) < 1 else gotwords[0]
					self.cpl_language_dict[lang][word] = (firstword, set())
				else:
					self.cpl_language_dict[lang][word] = ("--", set())

			self.cpl_language_dict[lang][word][1].update(gotwords)

	def uppercase(self, x):
		return x[0].upper()+x[1:]

	def _worderror(self, self.cpl_language_dict, word):
		print("Word error on", word)
		for lang in self.cpl_language_dict.keys():
			self.cpl_language_dict[lang][word] = None


	"""
	This will save a full dictionary into memory, overwriting prev files
	"""
	def save_dict_overwrite(self, listofenglishwords):
    	dr = "../updated_language_packs/"
    	for lang in self.cpl_language_dict.keys():
    		with open(dr + lang + ".txt", "w") as F:
    			for engword in listofenglishwords:
    				if engword in self.cpl_language_dict[lang]:
    					if self.cpl_language_dict[lang][engword]:
    						F.write(self.cpl_language_dict[lang][engword][0]+'#'+' '.join(self.cpl_language_dict[lang][engword][1])+'\n')
    					else:
    						F.write('ERROR\n')
    				else:
    					F.write('--\n')

    """
    This will only save the words themselves
    Input: Tuples of englishwords and their indexes they should be inserted in
    """
	def save_dict_insert(self, listofenglishtuples):
    	dr = "../updated_language_packs/"
    	for lang in self.cpl_language_dict.keys():
    		with open(dr + lang + ".txt", "r") as F:
    			words = F.read().split('\n')


			#if trying to insert words into a premade list that isnt long enough...
			m = max(listofenglishtuples, key=lambda x: x[1])
			if len(words) < m:
				raise Exception("Trying to insert at index: "+m+", which is larger than length of englishtuples: "+ len(words)+", for language: "+lang+". ")
			for tup in listofenglishtuples:
				word = tup[0]
				idx = tup[1]
				newline = None
				if engword in self.cpl_language_dict[lang]:
					if self.cpl_language_dict[lang][engword]:
						newline = self.cpl_language_dict[lang][engword][0]+'#'+' '.join(self.cpl_language_dict[lang][engword][1])
					else:
						newline = 'ERROR'
				else:
					newline = '--'
				words[idx] = newline

    		with open(dr + lang + ".txt", "w") as F:
    			F.write('\n'.join(words))



