
	var NoOffFirstLineMenus=8;			// Number of first level items
	var LowBgColor='white';			// Background color when mouse is not over
	var LowSubBgColor='white';			// Background color when mouse is not over on subs
	var HighBgColor='8383FF';			// Background color when mouse is over
	var HighSubBgColor='9393ff';			// Background color when mouse is over on subs
	var FontLowColor='8383FF';			// Font color when mouse is not over
	var FontSubLowColor='8383FF';			// Font color subs when mouse is not over
	var FontHighColor='white';			// Font color when mouse is over
	var FontSubHighColor='white';			// Font color subs when mouse is over
	var BorderColor='white';			// Border color
	var BorderSubColor='white';			// Border color for subs
	var BorderWidth=1;				// Border width
	var BorderBtwnElmnts=1;			// Border between elements 1 or 0
	var FontFamily="verdana,arial,technical"	// Font family menu items
	var FontSize=9;				// Font size menu items
	var FontBold=0;				// Bold menu items 1 or 0
	var FontItalic=0;				// Italic menu items 1 or 0
	var MenuTextCentered='left';			// Item text position 'left', 'center' or 'right'
	var MenuCentered='left';			// Menu horizontal position 'left', 'center' or 'right'
	var MenuVerticalCentered='top';		// Menu vertical position 'top', 'middle','bottom' or static
	var ChildOverlap=.1;				// horizontal overlap child/ parent
	var ChildVerticalOverlap=.2;			// vertical overlap child/ parent
	var StartTop=75;				// Menu offset x coordinate
	var StartLeft=51;				// Menu offset y coordinate
	var VerCorrect=0;				// Multiple frames y correction
	var HorCorrect=0;				// Multiple frames x correction
	var LeftPaddng=3;				// Left padding
	var TopPaddng=2;				// Top padding
	var FirstLineHorizontal=1;			// SET TO 1 FOR HORIZONTAL MENU, 0 FOR VERTICAL
	var MenuFramesVertical=1;			// Frames in cols or rows 1 or 0
	var DissapearDelay=100;			// delay before menu folds in
	var TakeOverBgColor=1;			// Menu frame takes over background color subitem frame
	var FirstLineFrame='navig';			// Frame where first level appears
	var SecLineFrame='space';			// Frame where sub levels appear
	var DocTargetFrame='space';			// Frame where target documents appear
	var TargetLoc='';				// span id for relative positioning
	var HideTop=0;				// Hide first level when loading new document 1 or 0
	var MenuWrap=1;				// enables/ disables menu wrap 1 or 0
	var RightToLeft=0;				// enables/ disables right to left unfold 1 or 0
	var UnfoldsOnClick=0;			// Level 1 unfolds onclick/ onmouseover
	var WebMasterCheck=0;			// menu tree checking on or off 1 or 0
	var ShowArrow=1;				// Uses arrow gifs when 1
	var KeepHilite=1;				// Keep selected path highligthed
	var Arrws=['/menu/tri.gif',5,10,'/menu/tridown.gif',10,5,'/menu/trileft.gif',5,10];
 // Arrow source, width and height

function BeforeStart(){return}
function AfterBuild(){return}
function BeforeFirstOpen(){return}
function AfterCloseAll(){return}

//	MenuX=new Array(Text to show, Link, background image (optional), number of sub elements, height, width);
//	For rollover images set "Text to show" to:  "rollover:Image1.jpg:Image2.jpg"

Menu1=new Array("Home","http://www.geofftech.co.uk/","",0,20,46);

Menu2=new Array("iBlog","http://www.geofftech.co.uk/iblog/","",0,20,42);

Menu3=new Array("50 pence (iN Da Pod)","http://www.geofftech.co.uk/50pence/","",6,20,150);
	Menu3_1=new Array("The Contributors","http://www.geofftech.co.uk/50pence/1to25.htm","",10,20,150);	
		Menu3_1_1=new Array("1 to 50","http://www.geofftech.co.uk/50pence/1to25.htm","",0,20,150);
		Menu3_1_2=new Array("51 to 100","http://www.geofftech.co.uk/50pence/51to75.htm","",0,20,150);
		Menu3_1_3=new Array("101 to 150","http://www.geofftech.co.uk/50pence/101to125.htm","",0,20,150);
		Menu3_1_4=new Array("151 to 200","http://www.geofftech.co.uk/50pence/151to175.htm","",0,20,150);
		Menu3_1_5=new Array("201 to 250","http://www.geofftech.co.uk/50pence/201to225.htm","",0,20,150);
		Menu3_1_6=new Array("251 to 300","http://www.geofftech.co.uk/50pence/251to275.htm","",0,20,150);
		Menu3_1_7=new Array("301 to 350","http://www.geofftech.co.uk/50pence/301to325.htm","",0,20,150);
		Menu3_1_8=new Array("351 to 400","http://www.geofftech.co.uk/50pence/351to375.htm","",0,20,150);
		Menu3_1_9=new Array("401 to 450","http://www.geofftech.co.uk/50pence/401to425.htm","",0,20,150);
		Menu3_1_10=new Array("451 to 500","http://www.geofftech.co.uk/50pence/451to475.htm","",0,20,150);
	Menu3_2=new Array("iParty","http://www.geofftech.co.uk/50pence/iparty/","",3,20,140);
		Menu3_2_1=new Array("iColour Competition","http://www.geofftech.co.uk/50pence/iparty/icolour/","",0,20,200);
		Menu3_2_2=new Array("Photos","http://www.geofftech.co.uk/50pence/iparty/photos/","",0,20,200);
		Menu3_2_3=new Array("Invite","http://www.geofftech.co.uk/50pence/iparty/invite/","",0,20,200);
	Menu3_3=new Array("The Tunes","http://www.geofftech.co.uk/50pence/thetunes.htm","",0);
	Menu3_4=new Array("Gold Coin Contributors","http://www.geofftech.co.uk/50pence/goldstar.htm","",0);
	Menu3_5=new Array("Download iPod Stuff!","http://www.geofftech.co.uk/50pence/download/","",0);
	Menu3_6=new Array("Statistics","http://www.geofftech.co.uk/50pence/statistics.htm","",0);
	
Menu4=new Array("The Tube","http://www.geofftech.co.uk/tube/","",7,20,78);
	Menu4_1=new Array("Tourist Advice","http://www.geofftech.co.uk/tube/advice.htm","",0,20,150);
	Menu4_2=new Array("Silly & Alternative Maps","http://www.geofftech.co.uk/tube/sillymaps/","",0);
	Menu4_3=new Array("Tube Links","http://www.geofftech.co.uk/tube/links.htm","",0);
	Menu4_4=new Array("Overheard","http://www.geofftech.co.uk/tube/overheard.htm","",0);
	Menu4_5=new Array("Quiz","http://www.geofftech.co.uk/tube/quiz.htm","",0);
	Menu4_6=new Array("Tube Tunes","http://www.geofftech.co.uk/tube/tunes.htm","",0);
	Menu4_7=new Array("Not on the map","http://www.geofftech.co.uk/tube/notonthemap.htm","",0);

Menu5=new Array("Tube Challenge","http://www.geofftech.co.uk/tubechallenge/","",5,20,118);
	Menu5_1=new Array("My Attempts","http://www.geofftech.co.uk/tubechallenge/","",12,20,160);
		Menu5_1_1=new Array("Tube 1 - All Bar Three","http://www.geofftech.co.uk/tubechallenge/tube1.htm","",0,20,200);
		Menu5_1_2=new Array("Tube 2 - A Record time?","http://www.geofftech.co.uk/tubechallenge/tube2.htm","",0,20,200);
		Menu5_1_3=new Array("Tube 3 - The Tube, 24 Hours","http://www.geofftech.co.uk/tubechallenge/tube3.htm","",0,20,200);
		Menu5_1_4=new Array("Tube 4 - Race around the Underground","http://www.geofftech.co.uk/tubechallenge/tube4.htm","",0,20,200);
		Menu5_1_5=new Array("Tube 5 - For fifths sake","http://www.geofftech.co.uk/tubechallenge/tube5.htm","",0,20,200);
		Menu5_1_6=new Array("Tube 6 - Six Underground","http://www.geofftech.co.uk/tubechallenge/tube6.htm","",0,20,200);
		Menu5_1_7=new Array("Tube 7 - World Record!","http://www.geofftech.co.uk/tubechallenge/tube7.htm","",0,20,200);
		Menu5_1_8=new Array("Tube 8 - Africamp","http://www.geofftech.co.uk/tubechallenge/tube8.htm","",0,20,200);
		Menu5_1_9=new Array("Tube 9 - TubeRelief","http://www.geofftech.co.uk/tubechallenge/tube9_tuberelief.htm","",0,20,200);
		Menu5_1_10=new Array("Media 1 - Tube 3 on TV","http://www.geofftech.co.uk/tubechallenge/media1.htm","",0,20,200);
		Menu5_1_11=new Array("Media 2 - Tube 4 on TV","http://www.geofftech.co.uk/tubechallenge/media2.htm","",0,20,200);
		Menu5_1_12=new Array("Media 3 - Tube 7 in the press","http://www.geofftech.co.uk/tubechallenge/media3.htm","",0,20,200);
		
	Menu5_2=new Array("Alternative Challenges","http://www.geofftech.co.uk/tubechallenge/alternative.htm","",4,20,160);
		Menu5_2_1=new Array("Zone 1 Only","http://www.geofftech.co.uk/tubechallenge/alt_zone1/","",0,20,160);
		Menu5_2_2=new Array("Bottle Shape/Circle Line","http://www.geofftech.co.uk/tubechallenge/alt_circle/","",0,20,160);
		Menu5_2_3=new Array("All lines shortest time","http://www.geofftech.co.uk/tubechallenge/alt_linesshortesttime/","",0,20,160);
		Menu5_2_4=new Array("Alphabet Challenge","http://www.geofftech.co.uk/tubechallenge/alt_alphabet/","",0,20,160);
		
	Menu5_3=new Array("The Rules","http://www.geofftech.co.uk/tubechallenge/therules.htm","",0,20,140);
	Menu5_4=new Array("Challenge History","http://www.geofftech.co.uk/tubechallenge/others.htm","",0,20,140);
	Menu5_5=new Array("Around the world","http://www.geofftech.co.uk/tubechallenge/worldwide.htm","",0,20,140);
		
Menu6=new Array("Theories & Obsessions","http://www.geofftech.co.uk/obsessions/","",7,20,160);
	Menu6_1=new Array("Car Parking Theory","http://www.geofftech.co.uk/rants/parking/","",0,20,180);
	Menu6_2=new Array("Telewest Trauma","http://www.geofftech.co.uk/rants/telewest/","",0,20,180);
	Menu6_3=new Array("South West Trains","http://www.geofftech.co.uk/rants/swt/","",0,20,180);
	Menu6_4=new Array("Go! The Airline","http://www.geofftech.co.uk/obsessions/go/","",0,20,160);
	Menu6_5=new Array("When is Easter?","http://www.geofftech.co.uk/obsessions/easter/","",0,20,140);
	
	Menu6_6=new Array("Fox's Biscuits","http://www.geofftech.co.uk/obsessions/foxs/","",2,20,140);
		Menu6_6_1=new Array("About Fox's","http://www.geofftech.co.uk/obsessions/foxs/about.htm","",0,20,180);
		Menu6_6_2=new Array("Whatever happened to...","http://www.geofftech.co.uk/obsessions/foxs/whatever.htm","",0,20,180);
	
	Menu6_7=new Array("iPods iPods iPods","http://www.geofftech.co.uk/obsessions/ipod/index.htm","",4,20,140);
		Menu6_7_1=new Array("iPod History","http://www.geofftech.co.uk/obsessions/ipod/ipod_history.htm","",0,20,160);
		Menu6_7_2=new Array("iPod Help/FAQ","http://www.geofftech.co.uk/obsessions/ipod/ipod_faq.htm","",0,20,160);
		Menu6_7_3=new Array("iPod accessories","http://www.geofftech.co.uk/obsessions/ipod/ipod_accessories.htm","",0,20,160);
		Menu6_7_4=new Array("How I bought my iPod","http://www.geofftech.co.uk/50pence/index.htm","",0,20,160);

Menu7=new Array("Fun Stuff","http://www.geofftech.co.uk/fun/","",8,20,70);
	Menu7_1=new Array("Christmas Lights","http://www.geofftech.co.uk/fun/xmaslights/index.htm","",0,20,160);
	Menu7_2=new Array("The Joy of Work","http://www.geofftech.co.uk/fun/atwork/index.htm","",0,20,140);
	Menu7_3=new Array("Never the best man","http://www.geofftech.co.uk/fun/weddings/index.htm","",0,20,140);
	Menu7_4=new Array("Revels Statistics","http://www.geofftech.co.uk/fun/revels/index.htm","",0,20,140);
	Menu7_5=new Array("Google Variations","http://www.geofftech.co.uk/fun/google/index.htm","",0,20,140);
	Menu7_6=new Array("Starbucks Decorations","http://www.geofftech.co.uk/fun/starbucks/index.htm","",0,20,160);
	Menu7_7=new Array("Foxs Millionaire","http://www.geofftech.co.uk/misc/millionaire/index.htm","",0,20,140);
	Menu7_8=new Array("Bananapost","http://www.geofftech.co.uk/fun/bananapost/index.htm","",3,20,140);
		Menu7_8_1=new Array("The first banana","http://www.geofftech.co.uk/fun/bananapost/b1.htm","",0,20,160);
		Menu7_8_2=new Array("The second banana","http://www.geofftech.co.uk/fun/bananapost/b2.htm","",0,20,160);
		Menu7_8_3=new Array("Beyond bananas","http://www.geofftech.co.uk/fun/bananapost/b3.htm","",0,20,160);

Menu8=new Array("Miscellaneous","http://www.geofftech.co.uk/misc/","",6,20,100);
	Menu8_1=new Array("Photo Gallery","http://www.geofftech.co.uk/gallery/","",0,20,160);
	Menu8_2=new Array("About Geofftech","http://www.geofftech.co.uk/misc/geofftech/","",0,20,140);
	Menu8_3=new Array("England Football Results","http://www.geofftech.co.uk/misc/englandresults/","",0,20,140);
	Menu8_4=new Array("Sampled Hits!","http://www.geofftech.co.uk/music/sampled/","",0,20,140);
	Menu8_5=new Array("My Last.FM","http://www.last.fm/user/geofftech/","",0,20,140);
	Menu8_6=new Array("Review of the year","http://www.geofftech.co.uk/archive/review2005/","",3,20,140);
		Menu8_6_1=new Array("2003","http://www.geofftech.co.uk/music/review2003/","",0,20,48);
		Menu8_6_2=new Array("2004","http://www.geofftech.co.uk/music/review2004/","",0,20,48);
		Menu8_6_3=new Array("2005","http://www.geofftech.co.uk/music/review2005/","",0,20,48);



	