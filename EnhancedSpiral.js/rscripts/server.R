require(Rook)
require(xts)
require(rjson)

find.freq <- function(x)
{
  n <- length(x)
  spec <- spec.ar(c(x),plot=FALSE)
  if(max(spec$spec)>10) # Arbitrary threshold chosen by trial and error.
  {
    period <- round(1/spec$freq[which.max(spec$spec)])
    if(period==Inf) # Find next local maximum
    {
      j <- which(diff(spec$spec)>0)
      if(length(j)>0)
      {
        nextmax <- j[1] + which.max(spec$spec[j[1]:500])
        period <- round(1/spec$freq[nextmax])
      }
      else
        period <- 1
    }
  }
  else
    period <- 1
  return(period)
}

find.freq.all <- function(x){  
  f=find.freq(x);
  freqs=c(f);  
  while(f>1){
    start=1; #also try start=f;
    x=period.apply(x,seq(start,length(x),f),mean); 
    f=find.freq(x);
    freqs=c(freqs,f);
  }
  if(length(freqs)==1){ return(freqs); }
  for(i in 2:length(freqs)){
    freqs[i]=freqs[i]*freqs[i-1];
  }
  freqs[1:(length(freqs)-1)];
}

s <- Rhttpd$new()

s$start(listen='127.0.0.1', port=29499, quiet=FALSE)

queryManager <- function(env) {
  req <- Request$new(env)
  res <- Response$new()
  response <- list()
  userData <- req$POST()
  if(!is.null(userData)) {
    query <- ""
    if(!is.null(userData$query))
      query <- userData$query
    response <- c(response, query = query)
    inputFileName <- "data/noise.csv"
    if(!is.null(userData$inputFileName))
      inputFileName <- userData$inputFileName
    response <- c(response, inputFileName = inputFileName)
    attribute <- "Noise"
    if(!is.null(userData$attr))
      attribute <- userData$attr
    response <- c(response, attr = attribute)
    filename <- paste("../", inputFileName, sep="")
    file <- read.table(filename, header=TRUE, sep=";", fill=FALSE, strip.white=TRUE, dec=".")
    if(query == "computeCycles") {
      print(is.numeric(file[, attribute]))
      c <- find.freq.all(file[,attribute])
      response <- c(response, cycles = list(c))
    }
  }
  res$header("content-type","application/json")
  res$write(toJSON(as.list(response)))
  res$finish()
}
s$add(app=queryManager, name='spiralQueryManager')

suspend_console()