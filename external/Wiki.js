var jsvnvwkwidget=jsvnvwkwidget ||(function(){
		var style = "";
		var html = "";
		var color = "";
		var text = "";
		var id = "";
		return {
			init:
				function (pText, pColor, pId) {
					color = pColor;
					text = pText;
					id = pId;
					style = "img.jsvnvwkimg{" +
						"display: initial!important;" +
						"vertical-align:middle;" +
						"height:13px!important;" +
						"width:20px!important;" +
						"padding-top:0!important;" +
						"padding-bottom:0!important;" +
						"border:none;" +
						"margin-top:0;" +
						"margin-right:5px!important;" +
						"margin-left:0!important;" +
						"margin-bottom:3px!important;" +
						"content:url('https://www.wiktionary.org/static/favicon/piece.ico')}" +
						".jsvnvwkimg:after{" +
						"vertical-align:middle;" +
						"height:25px;padding-top:0;" +
						"padding-bottom:0;" +
						"border:none;" +
						"margin-top:0;margin-right:6px;" +
						"margin-left:0;margin-bottom:4px!important;" +
						"content:url('https://www.wiktionary.org/portal/wiktionary.org/assets/img/Wiktionary-logo-tiles_2x.png')}" +
						".btn-container{" +
						"display:inline-block!important;" +
						"white-space:nowrap;min-width:160px}span.jsvnvwktext{color:#fff !important;letter-spacing: -0.15px!important;" +
						"text-wrap:none;vertical-align:middle;line-height:33px !important;padding:0;text-align:center;text-decoration:none!important; " +
						"text-shadow: 0 1px 1px rgba(34, 34, 34, 0.05);}" +
						".jsvnvwktext a{color:#fff !important;text-decoration:none:important;}" +
						".jsvnvwktext a:hover{color:#fff !important;text-decoration:none}" +
						"a.jsvnvwk-button{box-shadow: 1px 1px 0px rgba(0, 0, 0, 0.2);line-height:36px!important;min-width:150px;display:inline-block!important;background-color:#29abe0;padding:2px 12px !important;text-align:center !important;border-radius:7px;color:#fff;cursor:pointer;overflow-wrap:break-word;vertical-align:middle;border:0 none #fff !important;font-family:'Quicksand',Helvetica,Century Gothic,sans-serif !important;text-decoration:none;text-shadow:none;font-weight:700!important;font-size:14px !important}" +
						"a.jsvnvwk-button:visited{color:#fff !important;text-decoration:none !important}a.jsvnvwk-button:hover{opacity:.85;color:#f5f5f5 !important;text-decoration:none !important}" +
						"a.jsvnvwk-button:active{color:#f5f5f5 !important;text-decoration:none !important}" +
						".jsvnvwktext img.jsvnvwkimg {height:15px!important;width:22px!important;display: initial;animation: jsvnvwk-wiggle 3s infinite;}";
					style = style + "@keyframes jsvnvwk-wiggle{" +
						"10%{transform:rotate(0) scale(1)}" +
						"25%{transform:rotate(0) scale(1.12)}" +
						"30%{transform:rotate(0) scale(1.1)}" +
						"34%{transform:rotate(-10deg) scale(1.1)}" +
						"38%{transform:rotate(10deg) scale(1.1)}" +
						"42%{transform:rotate(-10deg) scale(1.1)}" +
						"46%{transform:rotate(10deg) scale(1.1)}" +
						"50%{transform:rotate(0) scale(1)}}";
					style = "<style>" + style + "</style>";
					html = "<link href='https://fonts.googleapis.com/css?family=Quicksand:400,700' rel='stylesheet' type='text/css'>";
					html += '<div class=btn-container>' +
						'<a title="Support Wikimedia on https://wikimediafoundation.org/support/" class="jsvnvwk-button" style="background-color:[color];" href="https://wikimediafoundation.org/support/" target="_blank"> ' +
						'<span class="jsvnvwktext"><img src="https://www.wiktionary.org/portal/wiktionary.org/assets/img/Wiktionary-logo-tiles_2x.png" alt="Wiki donations" class="jsvnvwkimg"/>' +
						'[text]</span></a></div>';
				},

			getHTML:
				function () {
					var rtn = style + html.replace("[color]", color).replace("[text]", text).replace("[id]", id);
					return rtn;
				},

			draw: function () {
				document.writeln(style + html.replace("[color]", color)
					.replace("[text]", text)
					.replace("[id]", id));

			}
		};
	}());