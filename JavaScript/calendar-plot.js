import { inject as service } from '@ember/service';
import Component from '@ember/component';
import Papa from "papaparse";
import { SVGGraph} from 'calendar-graph';

import {stringify} from "wellknown";

export default Component.extend({
    session: service('session'),
    notifications: service(),
    tip: null,
    init(){
        this._super(...arguments);
        // schedule plotting
        this.set("plotOnNextRender", true);
        this.set("graph", null);
    },
    didRender(){
      if(this.plotOnNextRender){
            this.loadData(this);
        }
    },
    loadData(ctx){
      // disable scheduling
      ctx.set("plotOnNextRender",false);
      ctx.graph = null;
      let data = ctx.get("resultData");
      let uri = ctx.get("factbaseUri");
      if(!data){
        ctx.notifications.error("ERROR 2502: nor result data specified.");
        return;
      }

      // trigger loding data from CSV using PapaParse
      Papa.parse(uri + data.data + "?access_token=" + this.get('session.data.authenticated.access_token'), {
        download: true,
        complete: this.init_plot(ctx)
      });
    },
    init_plot(ctx){
        return function(data){
            let d = data.data.map(function(v){return {date:v[0].substring(0,10), count:(v[1]<1?1:2)}});
            ctx.set("dta", d);
            ctx.updatePlot(ctx);
        }
    },
    updatePlot(ctx){
        let d = this.get("dta");
        let startDate = new Date(this.get("dStart"));
        let endDate = new Date(this.get("dEnd"));
        // split by years
        let yDif = endDate.getFullYear() - startDate.getFullYear();

        let sd = startDate;
        let ed = endDate;
        let curYear = this.get("curYear")?this.get("curYear"):0;
        if(curYear < sd.getFullYear())
            curYear = sd.getFullYear();
        if(curYear > ed.getFullYear())
            curYear = ed.getFullYear();
        this.set("curYear", curYear);
        // data covers more than one year?
        if(yDif > 0){
            startDate = new Date(curYear, 0, 1, 12);
            endDate = new Date(curYear, 11, 31, 12);
            if(curYear == sd.getFullYear()){
                startDate = sd;
            }else if(curYear == ed.getFullYear()){
                endDate = ed;
            }
        }
        let ops = {
            startDate: startDate,
            endDate: endDate,
            colorFun: (v) => {
                switch(v.count){
                    case 0:
                        return '#EFEFEF'
                    case 1:
                        return '#CDCDCD'
                    case 2:
                        return '#20639E'
                }
                return '#d6e685';
            }
        };
        if(!this.graph){
            // create new graph
            this.graph = new SVGGraph('#' + this.get("resultData").name, d, ops);
        }else{
            // update existing graph
            this.tooltipDestroy();
            this.graph.setOptions(ops)
        }
        this.tooltipInit();
    },
    onTooltipMouseOver(ctx){
        return function(e) {
            e = e || window.event;
            const elem = e.target || e.srcElement;
            const rect = elem.getBoundingClientRect();
            const count = elem.getAttribute('data-count');
            const date = elem.getAttribute('data-date');
            ctx.tip.style.display = 'block';
            switch(count){
                case "0":
                    ctx.tip.textContent = `${date}: no data`;
                    break;
                case "1":
                    ctx.tip.textContent = `${date}: image unmatched`;
                    break;
                case "2":
                    ctx.tip.textContent = `${date}: image matched (click to download)`;
                    document.body.style.cursor = 'pointer';
                    break;
                default:
                    ctx.tip.textContent = `${date}: unknown`;
            }
            const w = ctx.tip.getBoundingClientRect().width;
            ctx.tip.style.left = `${rect.left - (w / 2) + 6}px`;
            ctx.tip.style.top = `${rect.top - 35}px`;
        }
    },
    onTooltipMouseOut(ctx){
        return function(e) {
            e = e || window.event;
            ctx.tip.style.display = 'none';
            document.body.style.cursor = 'default';
        }
    },
    setResultFunction(ctx){
        return function(result){
            document.body.style.cursor = 'default';
            if (result.feed["opensearch:totalResults"] > 0){
                for (var entry of result.feed.entry){
                    var tempLink = document.createElement('a');
                    tempLink.href = entry.link[0].href;
                    tempLink.setAttribute('download', entry.title + '.zip');
                    tempLink.click();
                }
            }else{
                ctx.notifications.error("ERROR 2505: Something went wrong! No images found.")
            }
        }
    },
    setHandleErrorFunction(ctx){
        return function(XMLHttpRequest) {
            document.body.style.cursor = 'default';
            if (XMLHttpRequest.status == 0) {
                ctx.notifications.error('ERROR 2202: Cannot load data because of unknown network error.');
            } else if (XMLHttpRequest.status == 404) {
                ctx.notifications.error('ERROR 2204: Cannot load data because requested URL was not found.');
            } else if (XMLHttpRequest.status == 500) {
                ctx.notifications.error('ERROR 2205: Cannot load data because of an internel server error.');
            }  else {
                ctx.notifications.error('ERROR 2201: Unknow Error.\n' + XMLHttpRequest.responseText);
            }
        }
    },
    onTooltipClick(ctx){
        return function(e) {
            e = e || window.event;
            const elem = e.target || e.srcElement;
            if (!confirm("For downloading the images you will be forwarded to the Copernicus Open Acces Hub and asked to enter your Copernicus Open Acces Hub credentials. The Sen2Cube.at system will not be able to access to your credentials. Do NOT enter your Sen2Cube.at username and password.")){return}
            if (elem.getAttribute('data-count') == 2){
                document.body.style.cursor = 'wait';
                const date = elem.getAttribute('data-date');
                var query = [];
                query.push("platformname:Sentinel-2")
                for (var feature of ctx.get("AOI").features){
                    query.push('footprint:"Intersects('+stringify(feature)+')"')
                }
                query.push("beginPosition:["+date+"T00:00:00.000Z TO "+date+"T23:59:59.999Z]");
                query.push("endPosition:["+date+"T00:00:00.000Z TO "+date+"T23:59:59.999Z]");

                var url = 'https://demo.sen2cube.at/dhus/search?q=('+query.join(" AND ") +')&format=json';

                $.ajax({
                    url: url,
                    dataType: "json",
                    success: ctx.setResultFunction(ctx),
                    error: ctx.setHandleErrorFunction(ctx)
                });
            }
        }
    },
    tooltipInit() {
        this.set("tip", document.getElementById(this.get("resultData").name + "-tooltip"));
        let elems = document.getElementsByClassName('cg-day');
        for (let i = 0; i < elems.length; i++) {
          if (document.body.addEventListener) {
            elems[i].addEventListener('mouseover', this.onTooltipMouseOver(this), false);
            elems[i].addEventListener('mouseout', this.onTooltipMouseOut(this), false);
            elems[i].addEventListener('click', this.onTooltipClick(this), false);
          } else {
            elems[i].attachEvent('onmouseover', this.onTooltipMouseOver(this));
            elems[i].attachEvent('onmouseout', this.onTooltipMouseOut(this));
            elems[i].attachEvent('click', this.onTooltipClick(this));
          }
        }
    },
    tooltipDestroy(){
        let elems = document.getElementsByClassName('cg-day');
        for (let i = 0; i < elems.length; i++) {
            if (document.body.addEventListener) {
              elems[i].removeEventListener('mouseover', this.onTooltipMouseOver(this), false);
              elems[i].removeEventListener('mouseout', this.onTooltipMouseOut(this), false);
              elems[i].removeEventListener('click', this.onTooltipClick, false);
            } else {
              elems[i].detachEvent('onmouseover', this.onTooltipMouseOver);
              elems[i].detachEvent('onmouseout', this.onTooltipMouseOut);
              elems[i].detachEvent('click', this.onTooltipClick);
            }
        }
    },
    actions:{
        prevYear(){
            this.set("curYear", this.get("curYear")-1);
            this.updatePlot();
        },
        nextYear(){
            this.set("curYear", this.get("curYear")+1);
            this.updatePlot();
        }
    }
});
