import requests
import time
from bs4 import BeautifulSoup
import re
from pprint import pprint as pp


# Regex to remove mongolian bad chars:
# (ᠪ|ᠠ|ᠶ|ᠢ|ᠬ|ᠤ|ᠴ|ᠳ|ᠨ|ᠢ|ᠭ|ᠡ|ᠷ|ᠨ|ᠣ|ᠵ|ᠠ|ᠮ|ᠰ|ᠢ|ᠨ|᠎|ᠦ|ᠮ|ᠥ|ᠲ|᠋|ᠩ|ᠦ|ᠯ|ᠸ| |ᠱ|ᠺ|ᠧ|ᠫ|ᠽ|ᠻ|᠌|ᠹ)


class Scraper:

	def __init__(self):
		with open('../updated_language_packs/available_languages.txt') as F:
			self.short_2_langname = {x.split('\t')[1]:self.uppercase(x.split('\t')[0]) for x in F.read().split('\n')}
			self.cpl_language_dict = {x:dict() for x in self.short_2_langname.values()}

		self.myreg = re.compile("^(" + '|'.join(list(self.short_2_langname.keys())) + ")$")

	def html_to_filled_vocab_dict(self, engword, force=False):
		words = None
		words = self._getWordsFromTables("https://en.wiktionary.org/wiki/" + engword + "/translations#Noun",  engword)
		if not words:
			words = self._getWordsFromTables("https://en.wiktionary.org/wiki/" + engword, engword)

		if words:
			self._addTranslatedWords(words, engword)
		else:
			if force:
				self._worderror(engword)
			else:
				raise Exception(engword +" failed")
			# urllib3.exceptions.ProtocolError, requests.exceptions.ConnectionError, http.client.RemoteDisconnected, requests.exceptions.ReadTimeout, urllib3.exceptions.ReadTimeoutError, TimeoutError


	"""
	<div class="pseudo NavFrame">
		<div class="NavHead" style="text-align: left;">
			a place where the dead are buried
			<span style="font-weight: normal">
				—
				<i>
					see
				</i>
			</span>
			<a href="/wiki/graveyard" title="graveyard">
				graveyard
			</a>
		</div>
	</div>

	"""

	def _getWordsFromTables(self, url, word):
		shortlang_translation_tuple = []

		def _get_soup(url):
			time.sleep(0.3)
			r = requests.get(url, timeout=10)
			html = r.content
			return BeautifulSoup(html, parser='lxml')



		try:

			htmlpage = _get_soup(url)
			frames = [frame for frame in htmlpage.find_all('div', { 'class' : 'NavFrame' }) if "id" in frame.attrs and frame["id"].startswith("Translation") ]

			if not frames:
				frame = htmlpage.find('div', { 'class' : 'NavHead' })
				newlink = frame.find("a").get("href")
				newurl = "https://en.wiktionary.org" + newlink
				print("redicrecting to:", newurl)
				htmlpage = _get_soup(newurl)
				frames = [frame for frame in htmlpage.find_all('div', { 'class' : 'NavFrame' }) if "id" in frame.attrs and frame["id"].startswith("Translation") ]

			groupoflinkedwords = [x.find_all("span", {'lang': self.myreg}) for x in frames]

			for linkedwords in groupoflinkedwords:
				shortlang_translation_tuple.append([])
				for linkedword in linkedwords:
					try:
						# WANT: shortlang_translation_tuple[-1].append(['cs', 'word'])

						thislang = linkedword.get('lang')
						thisword = linkedword.find("a").text

						shortlang_translation_tuple[-1].append([thislang, thisword])

						# old: shortlang_translation_tuple[-1].append(linkedword['title'].split(':'))
						# shortlang_translation_tuple should be:
						# [
						#  [['de', 'word'], ['de', 'word']],
						#  [['cs', 'word']],
						# ]
					except:
						continue
		except Exception as e:
			pass

		return shortlang_translation_tuple



	"""
	Takes the dictionary of {LANGS:{WORDS:set()}}
	Updates the dictionary in place
	fills word sets
	tbls are found vocab tables on wikipedia (self._getWordsFromTables(url))
	self.cpl_language_dict must be initialized with {LANGS(capitlized):dict()}...}
	"""
	def _addTranslatedWords(self, wordtuple_list, word):

		popular_flag = False
		for wordgroup in wordtuple_list:
			# -> Word tables for popular uses of words have many languages featuring a translation for that usage.
			# So, if 80% of the languages we're looking for are included, we'll say it's a popular meaning.
			# Of course this is a heuristic. It's rare for there to be false positives, where one language has
			# so many possible translations that it makes it appear to be a popular word sense, when in reality it's not.
			# -> The first table on wikipedia seems to be the most popular usage.
			# However, if a language is missing that meaning, I still want to have a "first translation" of that word
			# available, so if a future table includes that language, and that translation of the word is a popular
			# translation, then there's no reason to not include that version of the word as that language's main translation.

			popular_flag = len(wordgroup) >= int(0.9 * len(self.short_2_langname))
			for shortlang, trsdword in wordgroup:
				if not trsdword:
					continue
				lang = self.short_2_langname[shortlang]
				if word not in self.cpl_language_dict[lang]:
					self.cpl_language_dict[lang][word] = [set(), set()]

				if popular_flag:
					self.cpl_language_dict[lang][word][0].add(trsdword)

				self.cpl_language_dict[lang][word][1].add(trsdword)

	def uppercase(self, x):
		return x[0].upper()+x[1:]

	def _worderror(self, word):
		print("Word error on", word)
		for lang in self.cpl_language_dict.keys():
			self.cpl_language_dict[lang][word] = None


	"""
	This will save a full dictionary into memory, overwriting prev files
	"""
	def save_dict_overwrite(self, listofenglishwords):
		wl = None
		dr = "../updated_language_packs/"
		for lang in self.cpl_language_dict.keys():
			with open(dr + lang + "_test.txt", "w") as F:
				for engword in listofenglishwords:
					if engword in self.cpl_language_dict[lang]:
						if self.cpl_language_dict[lang][engword]:
							wl = self.cpl_language_dict[lang][engword][1]
							popularwords = self.cpl_language_dict[lang][engword][0]
							if len(popularwords) == 0:
								popularwords.add('--')
							F.write('$'.join(popularwords) + '#' + '$'.join(wl) + '\n')
						else:
							F.write('ERROR\n')
					else:
						F.write('--\n')



	"""
	TODO:
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
				raise Exception("Trying to insert at index: " + m + ", which is larger than length of englishtuples: "+ len(words)+", for language: "+lang+". ")
			for tup in listofenglishtuples:
				word = tup[0]
				idx = tup[1]
				newline = None
				if engword in self.cpl_language_dict[lang]:
					if self.cpl_language_dict[lang][engword]:
						newline = self.cpl_language_dict[lang][engword][0] + '#' + '$'.join(self.cpl_language_dict[lang][engword][1])
					else:
						newline = 'ERROR'
				else:
					newline = '--'
				words[idx] = newline

			with open(dr + lang + "_errorsFIXED.txt", "w") as F:
				F.write('\n'.join(words))



# TODO: order words where words have values of
#		SUM(for all tables (LEN(TABLE) for that word))


class sortedList:
	def __init__(self):
		self.mylist = []

	def add(self, word, num):
		idx = self.find(word)
		if idx < 0:
			self.mylist.append([word, num])
		self.mylist[idx][1] += num

	def finish():
		self.sort()
		return [x[0] for x in self.mylist]

	def sort(self):
		self.mylist.sort(key=lambda x: x[1], reversed=True)

	def find(neww):
		for i, oldw in enumerate(colours):
			if neww == oldw:
				return i
		return -1


